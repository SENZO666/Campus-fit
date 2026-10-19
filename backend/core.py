import os
from datetime import date, datetime, timedelta, timezone
from typing import Annotated, List, Literal, Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import HTTPException, Request, Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"
TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"
DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"
USERNAME_PATTERN = r"^[a-z0-9_]{3,20}$"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=400, detail="That date isn't valid.")


def to_oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=404, detail="Not found.")
    return ObjectId(value)


PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, validation_alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc) if doc else None

    def to_mongo(self) -> dict:
        data = self.model_dump(exclude={"id"})
        if self.id:
            data["_id"] = ObjectId(self.id)
        return data


# ---------- Profile ----------
Goal = Literal["habit", "strength", "fitness", "mobility"]
Level = Literal["beginner", "intermediate", "advanced"]
Equipment = Literal["none", "basic", "full"]
Place = Literal["gym", "residence", "home"]


class DayAvailability(BaseModel):
    day: int = Field(ge=0, le=6)
    time: str = Field(pattern=TIME_PATTERN)


class ProfileDraft(BaseModel):
    goal: Goal
    level: Level
    days: List[DayAvailability] = Field(default_factory=list, max_length=7)
    session_length: int = Field(ge=10, le=60, multiple_of=5)
    equipment: Equipment
    place: Place

    @field_validator("days")
    @classmethod
    def unique_days(cls, v):
        if len({d.day for d in v}) != len(v):
            raise ValueError("Each day can only be chosen once.")
        return v


class Profile(ProfileDraft):
    days: List[DayAvailability] = Field(min_length=1, max_length=7)


class Privacy(BaseModel):
    share_by_default: bool = False
    allow_requests: bool = True
    show_streaks: bool = True


class User(BaseDocument):
    email: str
    password_hash: str
    name: str
    username: str
    role: Literal["student", "admin"] = "student"
    onboarded: bool = False
    profile: Optional[Profile] = None
    privacy: Privacy = Field(default_factory=Privacy)
    muted: List[str] = Field(default_factory=list)
    blocked: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=now_iso)

    def public(self) -> dict:
        return self.model_dump(exclude={"password_hash"})

    def brief(self) -> dict:
        return {"id": self.id, "name": self.name, "username": self.username}


# ---------- Sessions ----------
class SessionItem(BaseModel):
    exercise_id: str
    sets: int = Field(ge=1, le=6)
    reps: Optional[int] = Field(default=None, ge=1, le=100)
    duration_sec: Optional[int] = Field(default=None, ge=5, le=600)
    rest_sec: int = Field(ge=0, le=300)


class Session(BaseDocument):
    user_id: str
    week_start: str
    date: str
    time: str
    template: str
    title: str
    duration_min: int
    items: List[SessionItem]
    status: Literal["planned", "completed", "skipped"] = "planned"
    completed_at: Optional[str] = None
    difficulty: Optional[int] = None
    shared: bool = False
    reactions: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=now_iso)


class PeerLink(BaseDocument):
    requester_id: str
    addressee_id: str
    status: Literal["pending", "accepted"] = "pending"
    created_at: str = Field(default_factory=now_iso)


class Challenge(BaseDocument):
    name: str
    owner_id: str
    week_start: str
    target_per_member: int
    member_ids: List[str]
    invited_ids: List[str] = Field(default_factory=list)
    code: str
    created_at: str = Field(default_factory=now_iso)


class Report(BaseDocument):
    reporter_id: str
    reported_id: str
    reason: str
    details: str = ""
    status: Literal["open", "resolved"] = "open"
    created_at: str = Field(default_factory=now_iso)
    resolved_at: Optional[str] = None


# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(minutes=15)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh", "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Your session has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("type") != expected_type:
        raise HTTPException(status_code=401, detail="Invalid token type")
    return payload


def set_access_cookie(response: Response, user_id: str, email: str):
    response.set_cookie("access_token", create_access_token(user_id, email), httponly=True,
                        secure=True, samesite="none", max_age=900, path="/")


def set_auth_cookies(response: Response, user_id: str, email: str):
    set_access_cookie(response, user_id, email)
    response.set_cookie("refresh_token", create_refresh_token(user_id), httponly=True,
                        secure=True, samesite="none", max_age=604800, path="/")


async def get_current_user(request: Request) -> User:
    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token, "access")
    doc = await db.users.find_one({"_id": to_oid(payload["sub"])})
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User.from_mongo(doc)


async def get_user(user_id: str) -> Optional[User]:
    if not ObjectId.is_valid(user_id):
        return None
    return User.from_mongo(await db.users.find_one({"_id": ObjectId(user_id)}))


async def users_by_ids(ids) -> dict:
    oids = [ObjectId(i) for i in set(ids) if ObjectId.is_valid(i)]
    docs = await db.users.find({"_id": {"$in": oids}}).to_list(1000)
    return {u.id: u for u in (User.from_mongo(d) for d in docs)}
