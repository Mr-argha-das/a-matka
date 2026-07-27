import uuid
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from app.auth import get_current_user, require_admin
from app.models import Bid, Market, RateChart, Result, Transaction, Wallet
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["Market Result Management"])
IST = ZoneInfo("Asia/Kolkata")


# -----------------------------
# GAME RATES
# -----------------------------
GAME_RATES = {
    "single": 9,
    "jodi": 95,
    "single_panna": 140,
    "double_panna": 300,
    "triple_panna": 600,
    "half_sangam": 1200,
    "full_sangam": 10000,
}


# -----------------------------
# INPUT MODEL
# -----------------------------
class ResultDeclare(BaseModel):
    game_id: str
    date: str
    session: str  # open / close
    open_digit: str = None
    open_panna: str = None
    close_digit: str = None
    close_panna: str = None


def payout_rate(chart: RateChart, game_type: str) -> float:
    field_prefixes = {
        "single": "single_digit",
        "jodi": "jodi_digit",
        "single_panna": "single_pana",
        "sp": "single_pana",
        "double_panna": "double_pana",
        "dp": "double_pana",
        "triple_panna": "tripple_pana",
        "tp": "tripple_pana",
        "half_sangam": "half_sangam",
        "full_sangam": "full_sangam",
    }
    prefix = field_prefixes.get(game_type)
    if not prefix:
        return 0

    configured_multiplier = getattr(chart, f"{prefix}_x", 0) or 0
    if configured_multiplier > 0:
        return float(configured_multiplier)

    stake = getattr(chart, f"{prefix}_1", 0) or 0
    winning = getattr(chart, f"{prefix}_2", 0) or 0
    return float(winning) / float(stake) if stake > 0 else 0


def result_day_bounds(result_date):
    if isinstance(result_date, str):
        result_date = datetime.fromisoformat(result_date)
    result_day = result_date.date()
    start_ist = datetime.combine(result_day, time.min, tzinfo=IST)
    end_ist = start_ist + timedelta(days=1)
    return (
        start_ist.astimezone(timezone.utc).replace(tzinfo=None),
        end_ist.astimezone(timezone.utc).replace(tzinfo=None),
    )


def is_winning_bid(bid, result_obj: Result, session: str) -> bool:
    open_digit = result_obj.open_digit or "-"
    close_digit = result_obj.close_digit or "-"
    open_panna = result_obj.open_panna or "-"
    close_panna = result_obj.close_panna or "-"

    if bid.game_type == "single":
        expected = open_digit if session == "open" else close_digit
        return bid.session == session and bid.digit == expected

    if bid.game_type in {"single_panna", "sp", "double_panna", "dp", "triple_panna", "tp"}:
        expected = open_panna if session == "open" else close_panna
        return bid.session == session and bid.digit == expected

    if session != "close":
        return False

    if bid.game_type == "jodi":
        return (
            open_digit != "-"
            and close_digit != "-"
            and bid.digit == open_digit + close_digit
        )

    if bid.game_type == "half_sangam":
        parts = bid.digit.split("-")
        if len(parts) != 2:
            return False
        panna, digit = parts
        return (
            (panna == open_panna and digit == close_digit)
            or (panna == close_panna and digit == open_digit)
        )

    if bid.game_type == "full_sangam":
        parts = bid.digit.split("-")
        return (
            len(parts) == 2
            and parts[0] == open_panna
            and parts[1] == close_panna
        )

    return False


def settle_results(market_id: str, result_obj: Result, session: str):
    chart = RateChart.objects().first()
    if not chart:
        raise HTTPException(500, "Rate chart not found")

    start_utc, end_utc = result_day_bounds(result_obj.date)
    bids = Bid.objects(
        market_id=market_id,
        bid_date__gte=start_utc,
        bid_date__lt=end_utc,
        is_settled=False,
    )
    composite_games = {"jodi", "half_sangam", "full_sangam"}
    settled_count = 0
    winner_count = 0
    total_payout = 0

    for bid in bids:
        if session == "open" and bid.game_type in composite_games:
            continue
        if bid.game_type not in composite_games and bid.session != session:
            continue

        if is_winning_bid(bid, result_obj, session):
            rate = payout_rate(chart, bid.game_type)
            if rate <= 0:
                raise HTTPException(500, f"Winning rate is not configured for {bid.game_type}")
            amount = bid.points * rate

            wallet = Wallet.objects(user_id=bid.user_id).first()
            if not wallet:
                wallet = Wallet(user_id=bid.user_id, balance=0).save()
            wallet.update(
                inc__balance=amount,
                set__updated_at=datetime.utcnow(),
            )

            Transaction(
                tx_id=str(uuid.uuid4()),
                user_id=str(bid.user_id),
                bid_id=str(bid.id),
                amount=amount,
                payment_method="WIN",
                status="SUCCESS",
                created_at=datetime.utcnow(),
            ).save()
            winner_count += 1
            total_payout += amount

        bid.update(set__is_settled=True)
        settled_count += 1

    return {
        "settled_count": settled_count,
        "winner_count": winner_count,
        "total_payout": total_payout,
    }
@router.post("/result/declare")
def declare_result(payload: ResultDeclare, admin=Depends(require_admin)):

    session = payload.session.lower()

    market = Market.objects(id=payload.game_id).first()
    if not market:
        raise HTTPException(404, "Market not found")

    result = Result.objects(
        market_id=payload.game_id,
        date=payload.date
    ).first()

    if not result:
        result = Result(
            market_id=payload.game_id,
            date=payload.date,
            open_digit="-",
            close_digit="-",
            open_panna="-",
            close_panna="-",
        )

    now = datetime.utcnow()

    if session == "open":
        result.open_digit = payload.open_digit or result.open_digit
        result.open_panna = payload.open_panna or result.open_panna
        result.open_declared_at = now

    elif session == "close":
        result.close_digit = payload.close_digit or result.close_digit
        result.close_panna = payload.close_panna or result.close_panna
        result.close_declared_at = now

    else:
        raise HTTPException(400, "Session must be open or close")

    result.save()

    # 🔥 Settlement with session control
    settlement = settle_results(payload.game_id, result, session)

    return {
        "message": f"{session.capitalize()} result declared & settled successfully",
        "settlement": settlement,
    }

# -----------------------------
# GET RESULTS BY DATE
# -----------------------------
@router.get("/results")
def get_results(date: str, admin=Depends(require_admin)):
    results = Result.objects(date=date)
    output = []

    for r in results:
        # fetch market name using the existing market schema
        market = Market.objects(id=r.market_id).first()

        output.append({
            "_id": str(r.id),
            "market_id": r.market_id,
            "game_name": market.name if market else "-",
            "date": r.date,
            "open_panna": r.open_panna,
            "open_digit": r.open_digit,
            "close_panna": r.close_panna,
            "close_digit": r.close_digit,
            "open_declared_at": getattr(r, "open_declared_at", None),
            "close_declared_at": getattr(r, "close_declared_at", None),
            "close_timne": market.close_time if market else "-",
            "open_time": market.open_time if market else "-",
        })

    return {"data": output}



# -----------------------------
# GET RESULT FOR GO BUTTON
# -----------------------------
@router.get("/result/find")
def find_result(date: str, game_id: str, session: str, admin=Depends(require_admin)):
    session = session.lower()
    r = Result.objects(market_id=game_id, date=date).first()

    if not r:
        return {"data": None}

    if session == "open":
        return {
            "data": {
                "open_panna": r.open_panna,
                "open_digit": r.open_digit
            }
        }

    elif session == "close":
        return {
            "data": {
                "close_panna": r.close_panna,
                "close_digit": r.close_digit
            }
        }

    else:
        raise HTTPException(400, "Invalid session")


@router.post("/result/{result_id}/resettle")
def resettle_result(result_id: str, admin=Depends(require_admin)):
    result = Result.objects(id=result_id).first()
    if not result:
        raise HTTPException(404, "Result not found")

    start_utc, end_utc = result_day_bounds(result.date)
    recovered_composite_bids = 0

    # Older settlement code could close Jodi/Sangam bids as losses when only
    # the open result existed. Re-open only bids that match the final result.
    if result.close_digit and result.close_digit != "-":
        composite_bids = Bid.objects(
            market_id=result.market_id,
            game_type__in=["jodi", "half_sangam", "full_sangam"],
            bid_date__gte=start_utc,
            bid_date__lt=end_utc,
            is_settled=True,
        )
        for bid in composite_bids:
            if is_winning_bid(bid, result, "close"):
                bid.update(set__is_settled=False)
                recovered_composite_bids += 1

    settlements = []
    if result.open_digit and result.open_digit != "-":
        settlements.append(settle_results(result.market_id, result, "open"))
    if result.close_digit and result.close_digit != "-":
        settlements.append(settle_results(result.market_id, result, "close"))

    return {
        "message": "Result settlement completed",
        "recovered_composite_bids": recovered_composite_bids,
        "settled_count": sum(item["settled_count"] for item in settlements),
        "winner_count": sum(item["winner_count"] for item in settlements),
        "total_payout": sum(item["total_payout"] for item in settlements),
    }


@router.delete("/result/{result_id}")
def delete_result(result_id: str, admin=Depends(require_admin)):
    r = Result.objects(id=result_id).first()
    if not r:
        raise HTTPException(404, "Result not found")

    r.delete()
    return {"message": "Result deleted"}




from datetime import datetime

@router.get("/win-history")
def win_history(user=Depends(get_current_user)):

    chart = RateChart.objects().first()
    if not chart:
        raise HTTPException(status_code=500, detail="Rate chart not found")

    RATE_MAP = {
        "single": chart.single_digit_x,
        "jodi": chart.jodi_digit_x,
        "single_panna": chart.single_pana_x,
        "double_panna": chart.double_pana_x,
        "triple_panna": chart.tripple_pana_x,
        "half_sangam": chart.half_sangam_x,
        "full_sangam": chart.full_sangam_x,
    }

    bids = Bid.objects(user_id=str(user.id))
    win_data = []

    for bid in bids:

        market = Market.objects(id=bid.market_id).first()
        if not market:
            continue

        # -------- EXACT DATE MATCH USING bid_date --------
        start_of_day = datetime.combine(bid.bid_date.date(), datetime.min.time())
        end_of_day = datetime.combine(bid.bid_date.date(), datetime.max.time())

        result = Result.objects(
            market_id=bid.market_id,
            date__gte=start_of_day,
            date__lte=end_of_day
        ).first()

        if not result:
            continue

        win = False

        # -------- WIN LOGIC --------
        if bid.game_type == "single" and bid.digit == result.open_digit:
            win = True

        elif bid.game_type == "jodi" and bid.digit == result.open_digit + result.close_digit:
            win = True

        elif bid.game_type == "single_panna" and bid.digit == result.open_panna:
            win = True

        elif bid.game_type == "double_panna" and bid.digit == result.close_panna:
            win = True

        elif bid.game_type == "triple_panna":
            if bid.session == "open" and bid.digit == result.open_panna:
                win = True
            elif bid.session == "close" and bid.digit == result.close_panna:
                win = True

        elif bid.game_type == "half_sangam":
            panna, digitx = bid.digit.split("-")
            if panna == result.open_panna and digitx == result.close_digit:
                win = True
            elif panna == result.close_panna and digitx == result.open_digit:
                win = True

        elif bid.game_type == "full_sangam":
            op, cp = bid.digit.split("-")
            if op == result.open_panna and cp == result.close_panna:
                win = True

        if not win:
            continue

        rate = RATE_MAP.get(bid.game_type, 0)
        win_amount = bid.points * rate

        # Fetch exact transaction (Win type only recommended)
        tx = Transaction.objects(
            user_id=str(user.id),
            amount=win_amount,
            payment_method="Win"
        ).order_by('-created_at').first()

        win_data.append({
            "game_name": market.name,
            "game_type": bid.game_type,
            "points": bid.points,
            "digit_or_panna": bid.digit,
            "win_amount": win_amount,
            "bid_date": bid.bid_date,
            "session": bid.session,
            "declared_result": {
                "open_digit": result.open_digit,
                "open_panna": result.open_panna,
                "close_digit": result.close_digit,
                "close_panna": result.close_panna
            },
            "result_declared_at": result.date,
            "tx_id": tx.tx_id if tx else None
        })

    return {"wins": win_data}
