import json
from fastapi import APIRouter, HTTPException
from datetime import datetime
from zoneinfo import ZoneInfo
from ..models import Market, Result

IST = ZoneInfo("Asia/Kolkata")

def to_time(t: str):
    """Accept both time formats used by existing market records."""
    for fmt in ("%I:%M %p", "%H:%M"):
        try:
            return datetime.strptime(t.strip(), fmt).time()
        except (AttributeError, ValueError):
            continue
    raise HTTPException(status_code=422, detail=f"Invalid market time: {t}")

def is_market_running(open_time: str, close_time: str):
    now = datetime.now(IST)
    open_t = to_time(open_time)
    close_t = to_time(close_time)
    open_dt = now.replace(hour=open_t.hour, minute=open_t.minute, second=0, microsecond=0)
    close_dt = now.replace(hour=close_t.hour, minute=close_t.minute, second=0, microsecond=0)

    if close_dt > open_dt:
        return now <= close_dt

    return now >= open_dt or now <= close_dt

def result_fields(market_id: str):
    result = Result.objects(market_id=market_id).order_by("-date").first()
    open_panna = result.open_panna if result and result.open_panna else "-"
    open_digit = result.open_digit if result and result.open_digit else "-"
    close_panna = result.close_panna if result and result.close_panna else "-"
    close_digit = result.close_digit if result and result.close_digit else "-"

    final_result = "-"
    if open_panna != "-":
        final_result = f"{open_panna}-{open_digit}-{close_digit}-{close_panna}"

    return {
        "open_result": open_panna,
        "close_result": close_panna,
        "open_digit": open_digit,
        "close_digit": close_digit,
        "final_result": final_result,
    }


def serialize_market(market):
    data = json.loads(market.to_json())
    data.update(result_fields(str(market.id)))
    data.update({
        "id": str(market.id),
        "status": (
            "Market Running"
            if market.status and is_market_running(market.open_time, market.close_time)
            else "Market Closed"
        ),
    })
    return data

router = APIRouter(prefix="/market")


# ---------------------------
# CREATE MARKET
# ---------------------------
@router.post("/create")
def create_market(
    name: str,
    open_time: str,
    close_time: str,
    open_result: str = "-",
    close_result: str = "-",
    hindi: str = "",
    marketType: str = "Market",
):
    if Market.objects(name=name).first():
        raise HTTPException(400, "Market already exists")

    market = Market(
        name=name,
        hindi=hindi,
        open_time=open_time,
        close_time=close_time,
        marketType=marketType,
    )
    market.save()

    if open_result != "-" or close_result != "-":
        Result(
            market_id=str(market.id),
            open_panna=None if open_result == "-" else open_result,
            close_panna=None if close_result == "-" else close_result,
        ).save()

    return {"msg": "Market created successfully", "market": json.loads(market.to_json())}


# ---------------------------
# UPDATE MARKET
# ---------------------------
@router.put("/update/{market_id}")
def update_market(market_id: str, name: str = None, open_time: str = None, close_time: str = None):

    market = Market.objects(id=market_id).first()
    if not market:
        raise HTTPException(404, "Market not found")

    if name:
        market.name = name
    if open_time:
        market.open_time = open_time
    if close_time:
        market.close_time = close_time
    market.save()
    return {"msg": "Market updated", "market": json.loads(market.to_json())}



    return {"msg": "Market updated", "market": market}

# ---------------------------
# DELETE MARKET
# ---------------------------
@router.delete("/delete/{market_id}")
def delete_market(market_id: str):
    market = Market.objects(id=market_id).first()
    if not market:
        raise HTTPException(404, "Market not found")

    market.delete()
    return {"msg": "Market deleted successfully"}


# ---------------------------
# GET SINGLE MARKET (with status + result)
# ---------------------------
@router.get("/{market_id}")
def get_market(market_id: str):

    m = Market.objects(id=market_id).first()
    if not m:
        raise HTTPException(404, "Market not found")

    return serialize_market(m)

# ---------------------------
# GET ALL MARKETS (FULL + CLEAN)
# ---------------------------
@router.get("/")
def get_all_markets():

    markets = []

    for m in Market.objects.order_by("open_time"):
        markets.append(serialize_market(m))

    return {"status": "success", "count": len(markets), "markets": markets}

# [Unit]
# Description=FastAPI App
# After=network.target

# [Service]
# User=ubuntu
# Group=ubuntu
# WorkingDirectory=/var/www/satka-matka
# Environment="PATH=/var/www/satka-matka/venv/bin"
# ExecStart=/var/www/satka-matka/venv/bin/gunicorn -k uvicorn.workers.UvicornWorker app:app --bind 127.0.0.1:8000

# [Install]
# WantedBy=multi-user.target

from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from ..models import Result, Market



def last_digit(panna):
    if not panna or panna == "-" or len(panna) != 3:
        return "-"
    total = sum(int(d) for d in panna)
    return str(total % 10)


# ================================
# ⭐ MONTHLY CHART API
# ================================
@router.get("/chart/monthly/{market_id}")
def get_monthly_chart(market_id: str):

    # Check market exists
    market = Market.objects(id=market_id).first()
    if not market:
        raise HTTPException(404, "Market not found")

    # Get last 30 days result
    results = Result.objects(market_id=str(market_id)).order_by("-date")[:30]

    chart = []

    for r in results:

        # Extract day name (Mon, Tue…)
        date_obj = datetime.strptime(r.date, "%Y-%m-%d")
        day_name = date_obj.strftime("%a")  # e.g. Wed, Tue

        chart.append({
            "date": r.date,
            "day": day_name,
            "open_panna": r.open_panna,
            "open_digit": last_digit(r.open_panna),
            "close_panna": r.close_panna,
            "close_digit": last_digit(r.close_panna)
        })

    return {
        "market_name": market.name,
        "chart_count": len(chart),
        "chart": chart
    }
