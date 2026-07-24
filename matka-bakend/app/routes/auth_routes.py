from datetime import datetime, timedelta
import uuid
import json
import secrets
from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.error import HTTPError, URLError
from fastapi import APIRouter, Depends, HTTPException
from jose import jwt, JWTError
from ..config import settings as app_settings
from ..models import DevloperAccess, OTPChallenge, SiteSettings, Transaction, User, Wallet
from ..schemas import UserCreate, LoginSchema, SendOTPRequest, VerifyOTPRequest, Token, UserOut
from ..utils import hash_password, verify_password, create_access_token

import random
import string

router = APIRouter(prefix="/auth", tags=["auth"])

OTP_EXPIRY_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


def normalize_mobile(mobile: str) -> str:
    value = mobile.strip().replace("+91", "").replace(" ", "").replace("-", "")
    if not value.isdigit() or len(value) != 10:
        raise HTTPException(400, "Mobile must be 10 digits")
    return value


def call_sms_api(params: dict) -> dict:
    if not app_settings.SMS_API_TOKEN:
        raise HTTPException(503, "SMS service is not configured")
    query = urlencode({"api_key": app_settings.SMS_API_TOKEN, **params})
    try:
        with urlopen(f"{app_settings.SMS_API_BASE_URL}?{query}", timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        try:
            payload = json.loads(exc.read().decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise HTTPException(502, "SMS provider rejected the request")

        message = payload.get("message") or payload.get("Details") or "SMS provider rejected the request"
        if isinstance(message, dict):
            parts = []
            for field_messages in message.values():
                if isinstance(field_messages, list):
                    parts.extend(str(item) for item in field_messages)
                else:
                    parts.append(str(field_messages))
            message = " ".join(parts)
        raise HTTPException(400, str(message))
    except (URLError, TimeoutError, json.JSONDecodeError):
        raise HTTPException(503, "OTP service is temporarily unavailable")
    return payload


def create_otp_token(mobile: str, purpose: str) -> str:
    return jwt.encode(
        {
            "sub": mobile,
            "purpose": purpose,
            "type": "otp_verified",
            "exp": datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
        },
        app_settings.JWT_SECRET,
        algorithm=app_settings.JWT_ALGORITHM,
    )


def require_verified_otp(token: str, mobile: str, purpose: str) -> None:
    try:
        payload = jwt.decode(token, app_settings.JWT_SECRET, algorithms=[app_settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(401, "OTP verification expired or invalid")
    if (
        payload.get("type") != "otp_verified"
        or payload.get("sub") != mobile
        or payload.get("purpose") != purpose
    ):
        raise HTTPException(401, "OTP verification does not match this request")


@router.post("/send-otp")
def send_otp(payload: SendOTPRequest):
    mobile = normalize_mobile(payload.mobile)
    purpose = payload.purpose.strip().lower()
    if purpose not in {"register", "login"}:
        raise HTTPException(400, "Invalid OTP purpose")

    user = User.objects(mobile=mobile).first()
    if purpose == "register" and user:
        raise HTTPException(400, "Mobile already registered")
    if purpose == "login":
        if not user:
            raise HTTPException(404, "Mobile number is not registered")
        if user.role != "admin" and not user.status:
            raise HTTPException(403, "Your user ID is inactive. Please contact support.")

    recent = OTPChallenge.objects(mobile=mobile, purpose=purpose).order_by("-created_at").first()
    if recent and recent.created_at > datetime.utcnow() - timedelta(seconds=60):
        raise HTTPException(429, "Please wait 60 seconds before requesting another OTP")

    provider = call_sms_api({
        "otp_template_name": app_settings.SMS_OTP_TEMPLATE,
        "phone_number": mobile,
    })
    provider_status = str(provider.get("Status", "")).lower()
    provider_session = provider.get("Details")
    if provider_status and provider_status != "success":
        raise HTTPException(400, str(provider_session or "Failed to send OTP"))
    if not provider_session:
        raise HTTPException(400, "OTP session was not received")

    OTPChallenge.objects(mobile=mobile, purpose=purpose).delete()
    OTPChallenge(
        mobile=mobile,
        purpose=purpose,
        provider_session=str(provider_session),
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
    ).save()
    return {"message": "OTP sent successfully", "expires_in": OTP_EXPIRY_MINUTES * 60}


@router.post("/verify-otp")
def verify_otp(payload: VerifyOTPRequest):
    mobile = normalize_mobile(payload.mobile)
    purpose = payload.purpose.strip().lower()
    if not payload.otp.isdigit() or len(payload.otp) not in {4, 5, 6}:
        raise HTTPException(400, "Enter a valid OTP")

    challenge = OTPChallenge.objects(mobile=mobile, purpose=purpose).order_by("-created_at").first()
    if not challenge or challenge.expires_at < datetime.utcnow():
        raise HTTPException(400, "OTP expired. Please request a new OTP")
    if challenge.attempts >= OTP_MAX_ATTEMPTS:
        challenge.delete()
        raise HTTPException(429, "Too many invalid attempts. Please request a new OTP")

    challenge.update(inc__attempts=1)
    provider = call_sms_api({
        "otp_session": challenge.provider_session,
        "otp_entered_by_user": payload.otp,
    })
    if str(provider.get("Status", "")).lower() != "success":
        raise HTTPException(400, str(provider.get("Details") or "Invalid OTP"))

    challenge.delete()
    return {
        "message": "OTP verified successfully",
        "otp_token": create_otp_token(mobile, purpose),
    }

# @router.post("/register", response_model=UserOut)
# def register(payload: UserCreate):

#     # 1. Check if mobile exists
#     if User.objects(mobile=payload.mobile).first():
#         raise HTTPException(400, "Mobile already registered")

#     # 2. Create user with password hash
#     hashed = hash_password(payload.password)

#     new_user = User(
#         username=payload.username,
#         mobile=payload.mobile,
#         role=payload.role,
#         password_hash=hashed,

#         # Referral details
#         referred_by=payload.referral_code if payload.referral_code else None,
#     ).save()

#     # 3. Create wallet for new user
#     Wallet(user_id=str(new_user.id), balance=0).save()

#     # ---------------------------------------------------
#     # 4. REFERRAL BONUS LOGIC
#     # ---------------------------------------------------
#     if payload.referral_code:

#         # Find the referring user
#         referrer = User.objects(referral_code=payload.referral_code).first()

#         if not referrer:
#             raise HTTPException(400, "Invalid referral code")

#         # Load referral bonus setting set by admin
#         settings = SiteSettings.objects().first()
#         bonus_amount = settings.referral_bonus if settings else 0

#         # Add bonus to referrer's wallet
#         ref_wallet = Wallet.objects(user_id=str(referrer.id)).first()
#         ref_wallet.balance += bonus_amount
#         ref_wallet.updated_at = datetime.datetime.utcnow()
#         ref_wallet.save()

#     # ---------------------------------------------------
#     # Response
#     # ---------------------------------------------------
#     return UserOut(
#         id=str(new_user.id),
#         username=new_user.username,
#         mobile=new_user.mobile,
#         balance=new_user.balance,
#         role=new_user.role
#     )



# ---- FUNCTION TO GENERATE UNIQUE REFERRAL CODE ----
def generate_referral_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


def generate_unique_referral_code():
    for _ in range(20):
        code = generate_referral_code()
        if not User.objects(referral_code=code).first():
            return code
    raise HTTPException(status_code=500, detail="Could not generate referral code")


def check_access():
    record = DevloperAccess.objects.first()
    if record and record.value is False:
        raise HTTPException(status_code=401, detail="Access Blocked by Developer")
    return True


@router.post("/register", dependencies=[Depends(check_access)])
def register(payload: UserCreate):
    username = payload.username.strip()
    mobile = normalize_mobile(payload.mobile)
    password = (payload.password or "").strip()
    referral_input = (payload.referral_code or "").strip().upper() or None
    if payload.otp_token:
        require_verified_otp(payload.otp_token, mobile, "register")
    elif not password:
        raise HTTPException(400, "Password or verified OTP is required")

    if not username:
        raise HTTPException(400, "Username is required")

    if not mobile.isdigit() or len(mobile) != 10:
        raise HTTPException(400, "Mobile must be 10 digits")

    # 1. Check if mobile exists
    if User.objects(mobile=mobile).first():
        raise HTTPException(400, "Mobile already registered")

    referrer = None
    if referral_input:
        referrer = User.objects(referral_code=referral_input).first()
        if not referrer:
            raise HTTPException(400, "Invalid referral code")

    # 3. Generate referral code for the new user
    referral_code = generate_unique_referral_code()
    settings = SiteSettings.objects().first()
    initial_balance = settings.welcome_bonus if settings else 5

    # 4. Create new user
    new_user = User(
        username=username,
        mobile=mobile,
        password_hash=hash_password(password or secrets.token_urlsafe(32)),
        referral_code=referral_code,
        referred_by=referral_input,
    ).save()

    # 5. Create wallet
    Wallet(user_id=str(new_user.id), balance=initial_balance).save()

    if referrer:
        bonus_amount = settings.referral_bonus if settings else 0

        ref_wallet = Wallet.objects(user_id=str(referrer.id)).first()
        if not ref_wallet:
            ref_wallet = Wallet(user_id=str(referrer.id), balance=0).save()

        if bonus_amount > 0:
            ref_wallet.balance += bonus_amount
            ref_wallet.updated_at = datetime.utcnow()
            ref_wallet.save()
            Transaction(
                tx_id=str(uuid.uuid4()),
                user_id=str(referrer.id),
                amount=bonus_amount,
                payment_method="Referral Bonus",
                status="SUCCESS"
            ).save()

    token = create_access_token(str(new_user.id))

    new_user.update(last_login=datetime.utcnow())

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(new_user.id),
            "username": new_user.username,
            "mobile": new_user.mobile,
            "role": new_user.role,
            "balance": initial_balance,
            "referral_code": referral_code,  
            "referred_by": referral_input
        }
    }

@router.post("/token", dependencies=[Depends(check_access)])
def login(payload: LoginSchema):
    # 1. Find user
    mobile = normalize_mobile(payload.mobile)
    user = User.objects(mobile=mobile).first()
    if not user:
        raise HTTPException(status_code=404, detail="Mobile number is not registered")

    if payload.otp_token:
        require_verified_otp(payload.otp_token, user.mobile, "login")
    elif payload.password:
        if not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Incorrect mobile or password")
    else:
        raise HTTPException(400, "Password or verified OTP is required")

    if user.role != "admin" and not user.status:
        raise HTTPException(status_code=403, detail="Your user ID is inactive. Please contact support.")

    # 3. Create token
    token = create_access_token(str(user.id))

    # 4. Update last login
    user.update(last_login=datetime.utcnow())

    # 5. Load wallet balance
    wallet = Wallet.objects(user_id=str(user.id)).first()
    balance = wallet.balance if wallet else 0

    return {
        "access_token": token,
        "token_type" :"bearer",
        "userId":str(user.id),
    }
