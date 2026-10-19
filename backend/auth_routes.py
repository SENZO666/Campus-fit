from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from core import (USERNAME_PATTERN, User, db, decode_token, get_current_user, hash_password, now_iso,
                  set_access_cookie, set_auth_cookies, to_oid, verify_password)

router = APIRouter(prefix="/api/auth")


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=40)
    username: str = Field(min_length=3, max_length=20)


class LoginIn(BaseModel):
    email: str
    password: str


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    return forwarded.split(",")[0].strip() if forwarded else request.client.host


@router.post("/register")
async def register(body: RegisterIn, response: Response):
    import re
    email = body.email.lower().strip()
    username = body.username.lower().strip().lstrip("@")
    if not re.match(USERNAME_PATTERN, username):
        raise HTTPException(400, "Usernames use 3–20 lowercase letters, numbers or underscores.")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "An account with this email already exists. Try logging in instead.")
    if await db.users.find_one({"username": username}):
        raise HTTPException(400, "That username is taken. Try adding a number or underscore.")
    user = User(email=email, password_hash=hash_password(body.password), name=body.name.strip(), username=username)
    result = await db.users.insert_one(user.to_mongo())
    user.id = str(result.inserted_id)
    set_auth_cookies(response, user.id, email)
    return user.public()


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower().strip()
    identifier = f"{client_ip(request)}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = datetime.fromisoformat(attempt["last"]) + timedelta(minutes=15)
        if datetime.now(timezone.utc) < locked_until:
            raise HTTPException(429, "Too many attempts. Please wait 15 minutes and try again.")
        await db.login_attempts.delete_one({"identifier": identifier})
    doc = await db.users.find_one({"email": email})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        await db.login_attempts.update_one({"identifier": identifier},
                                           {"$inc": {"count": 1}, "$set": {"last": now_iso()}}, upsert=True)
        raise HTTPException(401, "Email or password is incorrect.")
    await db.login_attempts.delete_one({"identifier": identifier})
    user = User.from_mongo(doc)
    set_auth_cookies(response, user.id, user.email)
    return user.public()


@router.post("/logout")
async def logout(response: Response):
    for key in ("access_token", "refresh_token"):
        response.delete_cookie(key, path="/", secure=True, samesite="none", httponly=True)
    return {"ok": True}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return user.public()


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "Not authenticated")
    payload = decode_token(token, "refresh")
    doc = await db.users.find_one({"_id": to_oid(payload["sub"])})
    if not doc:
        raise HTTPException(401, "User not found")
    user = User.from_mongo(doc)
    set_access_cookie(response, user.id, user.email)
    return {"ok": True}
