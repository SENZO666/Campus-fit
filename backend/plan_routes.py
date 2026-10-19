import re
from datetime import timedelta
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import (DATE_PATTERN, TIME_PATTERN, USERNAME_PATTERN, Privacy, Profile, ProfileDraft, Session,
                  SessionItem, User, db, get_current_user, monday_of, now_iso, parse_date, to_oid, users_by_ids)
from exercises_data import EXERCISE_MAP, EXERCISES
from planner import TEMPLATES, alternatives, build_session, build_week, suitable

router = APIRouter(prefix="/api")


# ---------- Exercises ----------
@router.get("/exercises")
async def list_exercises():
    return EXERCISES


@router.get("/exercises/suitable")
async def suitable_exercises(user: User = Depends(get_current_user)):
    return suitable(user.profile)


@router.get("/exercises/{exercise_id}/alternatives")
async def exercise_alternatives(exercise_id: str, user: User = Depends(get_current_user)):
    if exercise_id not in EXERCISE_MAP:
        raise HTTPException(404, "Exercise not found.")
    return alternatives(user.profile, exercise_id)


# ---------- Profile ----------
@router.put("/me/profile")
async def update_profile(body: Profile, user: User = Depends(get_current_user)):
    await db.users.update_one({"_id": ObjectId(user.id)}, {"$set": {"profile": body.model_dump(), "onboarded": True}})
    user.profile, user.onboarded = body, True
    return user.public()


class AccountIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    username: str = Field(min_length=3, max_length=20)


@router.put("/me/account")
async def update_account(body: AccountIn, user: User = Depends(get_current_user)):
    username = body.username.lower().strip().lstrip("@")
    if not re.match(USERNAME_PATTERN, username):
        raise HTTPException(400, "Usernames use 3–20 lowercase letters, numbers or underscores.")
    if await db.users.find_one({"username": username, "_id": {"$ne": ObjectId(user.id)}}):
        raise HTTPException(400, "That username is taken. Try adding a number or underscore.")
    await db.users.update_one({"_id": ObjectId(user.id)}, {"$set": {"name": body.name.strip(), "username": username}})
    user.name, user.username = body.name.strip(), username
    return user.public()


@router.put("/me/privacy")
async def update_privacy(body: Privacy, user: User = Depends(get_current_user)):
    await db.users.update_one({"_id": ObjectId(user.id)}, {"$set": {"privacy": body.model_dump()}})
    user.privacy = body
    return user.public()


@router.get("/me/hidden")
async def hidden_users(user: User = Depends(get_current_user)):
    users = await users_by_ids(user.muted + user.blocked)
    return [{**u.brief(), "muted": u.id in user.muted, "blocked": u.id in user.blocked} for u in users.values()]


# ---------- Plan builder ----------
@router.get("/plan/templates")
async def templates():
    return [{"id": k, "title": v["title"], "description": v["description"]} for k, v in TEMPLATES.items()]


class PreviewIn(BaseModel):
    profile: ProfileDraft
    week_start: Optional[str] = Field(default=None, pattern=DATE_PATTERN)
    today: Optional[str] = Field(default=None, pattern=DATE_PATTERN)


@router.post("/plan/preview")
async def preview(body: PreviewIn, user: User = Depends(get_current_user)):
    ws = parse_date(body.week_start) if body.week_start else None
    today = parse_date(body.today) if body.today else None
    return build_week(body.profile, ws, today)


class SessionBuildIn(BaseModel):
    template: str
    duration_min: int = Field(ge=10, le=60, multiple_of=5)
    offset: int = Field(default=0, ge=0, le=1000)
    keep_ids: List[str] = Field(default_factory=list)


@router.post("/plan/session")
async def build_one(body: SessionBuildIn, user: User = Depends(get_current_user)):
    if not user.profile:
        raise HTTPException(400, "Finish setting up your profile first.")
    if body.template not in TEMPLATES:
        raise HTTPException(400, "Unknown session type.")
    return build_session(user.profile, body.template, body.duration_min, body.offset, body.keep_ids)


# ---------- Weeks ----------
def check_week(week_start: str):
    ws = parse_date(week_start)
    if ws.weekday() != 0:
        raise HTTPException(400, "Weeks start on Monday.")
    return ws


async def week_sessions(user_id: str, week_start: str) -> List[Session]:
    docs = await db.sessions.find({"user_id": user_id, "week_start": week_start}).sort([("date", 1), ("time", 1)]).to_list(100)
    return [Session.from_mongo(d) for d in docs]


@router.get("/weeks/{week_start}")
async def get_week(week_start: str, user: User = Depends(get_current_user)):
    check_week(week_start)
    return await week_sessions(user.id, week_start)


class SessionIn(BaseModel):
    date: str = Field(pattern=DATE_PATTERN)
    time: str = Field(pattern=TIME_PATTERN)
    template: str
    title: str = Field(min_length=1, max_length=60)
    duration_min: int = Field(ge=10, le=60, multiple_of=5)
    items: List[SessionItem] = Field(min_length=1, max_length=12)


class WeekSaveIn(BaseModel):
    sessions: List[SessionIn] = Field(max_length=14)
    today: str = Field(pattern=DATE_PATTERN)


@router.put("/weeks/{week_start}")
async def save_week(week_start: str, body: WeekSaveIn, user: User = Depends(get_current_user)):
    ws = check_week(week_start)
    today = parse_date(body.today)
    for s in body.sessions:
        d = parse_date(s.date)
        if not (ws <= d <= ws + timedelta(days=6)):
            raise HTTPException(400, "Each session must fall within this week.")
        if d < today:
            raise HTTPException(400, "Sessions can't be planned on a date that has already passed.")
        if any(i.exercise_id not in EXERCISE_MAP for i in s.items):
            raise HTTPException(400, "One of the exercises couldn't be found.")
    await db.sessions.delete_many({"user_id": user.id, "week_start": week_start,
                                   "status": {"$ne": "completed"}, "date": {"$gte": body.today}})
    docs = [Session(user_id=user.id, week_start=week_start, **s.model_dump()).to_mongo() for s in body.sessions]
    if docs:
        await db.sessions.insert_many(docs)
    return await week_sessions(user.id, week_start)


@router.delete("/weeks/{week_start}")
async def clear_week(week_start: str, user: User = Depends(get_current_user)):
    check_week(week_start)
    result = await db.sessions.delete_many({"user_id": user.id, "week_start": week_start, "status": {"$ne": "completed"}})
    return {"deleted": result.deleted_count}


class TodayIn(BaseModel):
    today: str = Field(pattern=DATE_PATTERN)


@router.post("/weeks/{week_start}/regenerate")
async def regenerate_week(week_start: str, body: TodayIn, user: User = Depends(get_current_user)):
    ws = check_week(week_start)
    if not user.profile:
        raise HTTPException(400, "Finish setting up your profile first.")
    await db.sessions.delete_many({"user_id": user.id, "week_start": week_start,
                                   "status": "planned", "date": {"$gte": body.today}})
    taken = {s.date for s in await week_sessions(user.id, week_start) if s.date >= body.today}
    built = [s for s in build_week(user.profile, ws, parse_date(body.today)) if s["date"] not in taken]
    docs = [Session(user_id=user.id, week_start=week_start, **s).to_mongo() for s in built]
    if docs:
        await db.sessions.insert_many(docs)
    return await week_sessions(user.id, week_start)


# ---------- Sessions ----------
async def own_session(session_id: str, user: User) -> Session:
    doc = await db.sessions.find_one({"_id": to_oid(session_id), "user_id": user.id})
    if not doc:
        raise HTTPException(404, "Session not found.")
    return Session.from_mongo(doc)


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user: User = Depends(get_current_user)):
    return await own_session(session_id, user)


class RescheduleIn(BaseModel):
    date: str = Field(pattern=DATE_PATTERN)
    time: str = Field(pattern=TIME_PATTERN)
    today: str = Field(pattern=DATE_PATTERN)


@router.patch("/sessions/{session_id}/reschedule")
async def reschedule(session_id: str, body: RescheduleIn, user: User = Depends(get_current_user)):
    session = await own_session(session_id, user)
    if session.status == "completed":
        raise HTTPException(400, "Completed sessions can't be moved.")
    d = parse_date(body.date)
    if d < parse_date(body.today):
        raise HTTPException(400, "Choose today or a later date.")
    update = {"date": body.date, "time": body.time, "week_start": monday_of(d).isoformat(), "status": "planned"}
    await db.sessions.update_one({"_id": ObjectId(session.id)}, {"$set": update})
    return await own_session(session_id, user)


@router.post("/sessions/{session_id}/skip")
async def skip_session(session_id: str, user: User = Depends(get_current_user)):
    session = await own_session(session_id, user)
    if session.status == "completed":
        raise HTTPException(400, "This session is already complete.")
    await db.sessions.update_one({"_id": ObjectId(session.id)}, {"$set": {"status": "skipped"}})
    return await own_session(session_id, user)


class CompleteIn(BaseModel):
    difficulty: Optional[int] = Field(default=None, ge=1, le=5)
    shared: bool = False
    items: Optional[List[SessionItem]] = Field(default=None, min_length=1, max_length=12)


@router.post("/sessions/{session_id}/complete")
async def complete_session(session_id: str, body: CompleteIn, user: User = Depends(get_current_user)):
    session = await own_session(session_id, user)
    if session.status == "completed":
        raise HTTPException(400, "This session is already complete.")
    update = {"status": "completed", "completed_at": now_iso(), "difficulty": body.difficulty, "shared": body.shared}
    if body.items:
        if any(i.exercise_id not in EXERCISE_MAP for i in body.items):
            raise HTTPException(400, "One of the exercises couldn't be found.")
        update["items"] = [i.model_dump() for i in body.items]
    await db.sessions.update_one({"_id": ObjectId(session.id)}, {"$set": update})
    return await own_session(session_id, user)


class ShareIn(BaseModel):
    shared: bool


@router.patch("/sessions/{session_id}/share")
async def share_session(session_id: str, body: ShareIn, user: User = Depends(get_current_user)):
    session = await own_session(session_id, user)
    if session.status != "completed":
        raise HTTPException(400, "Only completed sessions can be shared.")
    await db.sessions.update_one({"_id": ObjectId(session.id)}, {"$set": {"shared": body.shared}})
    return await own_session(session_id, user)


# ---------- Progress ----------
@router.get("/progress")
async def progress(today: str, user: User = Depends(get_current_user)):
    current_ws = monday_of(parse_date(today))
    docs = await db.sessions.find({"user_id": user.id}).to_list(5000)
    sessions = [Session.from_mongo(d) for d in docs]
    completed = [s for s in sessions if s.status == "completed"]
    by_week = {}
    for s in sessions:
        by_week.setdefault(s.week_start, []).append(s)
    weekly = []
    for i in range(7, -1, -1):
        w = (current_ws - timedelta(weeks=i)).isoformat()
        items = by_week.get(w, [])
        weekly.append({"week_start": w, "planned": len(items), "completed": sum(1 for s in items if s.status == "completed")})
    done_weeks = {s.week_start for s in completed}
    w = current_ws if current_ws.isoformat() in done_weeks else current_ws - timedelta(weeks=1)
    streak = 0
    while w.isoformat() in done_weeks:
        streak += 1
        w -= timedelta(weeks=1)
    recent = sorted(completed, key=lambda s: s.completed_at or "", reverse=True)[:12]
    last = recent[0].completed_at if recent else None
    return {
        "total_completed": len(completed),
        "minutes_total": sum(s.duration_min for s in completed),
        "weekly": weekly,
        "streak_weeks": streak,
        "show_streaks": user.privacy.show_streaks,
        "last_completed_at": last,
        "recent": recent,
    }
