import os
from datetime import date, datetime, time, timedelta, timezone

from bson import ObjectId

from core import Challenge, PeerLink, Profile, Session, User, db, hash_password, monday_of, verify_password
from planner import build_week

STUDENTS = [
    {"email": "thandi@campusfit.app", "name": "Thandi M.", "username": "thandi_m",
     "profile": {"goal": "habit", "level": "beginner", "session_length": 20, "equipment": "none", "place": "residence",
                 "days": [{"day": 0, "time": "07:00"}, {"day": 2, "time": "17:30"}, {"day": 4, "time": "12:00"}]}},
    {"email": "lebo@campusfit.app", "name": "Lebo K.", "username": "lebo_k",
     "profile": {"goal": "strength", "level": "intermediate", "session_length": 30, "equipment": "basic", "place": "home",
                 "days": [{"day": 1, "time": "06:30"}, {"day": 3, "time": "18:00"}, {"day": 5, "time": "09:00"}]}},
    {"email": "sipho@campusfit.app", "name": "Sipho D.", "username": "sipho_d",
     "profile": {"goal": "fitness", "level": "beginner", "session_length": 25, "equipment": "full", "place": "gym",
                 "days": [{"day": 0, "time": "16:00"}, {"day": 3, "time": "16:00"}]}},
]


async def ensure_user(email, password, name, username, role="student", profile=None) -> User:
    doc = await db.users.find_one({"email": email})
    if doc is None:
        user = User(email=email, password_hash=hash_password(password), name=name, username=username, role=role,
                    onboarded=True, profile=Profile(**profile) if profile else None)
        result = await db.users.insert_one(user.to_mongo())
        user.id = str(result.inserted_id)
        return user
    user = User.from_mongo(doc)
    if not verify_password(password, user.password_hash):
        await db.users.update_one({"_id": ObjectId(user.id)}, {"$set": {"password_hash": hash_password(password)}})
    return user


def completed_at(d: str, t: str) -> str:
    dt = datetime.combine(date.fromisoformat(d), time.fromisoformat(t), tzinfo=timezone.utc) + timedelta(minutes=35)
    return dt.isoformat()


async def seed_week(user: User, ws: date, today: date, complete_past: str, share: bool):
    """complete_past: 'all' marks every past session complete, 'first' only the first one."""
    if await db.sessions.count_documents({"user_id": user.id, "week_start": ws.isoformat()}):
        return
    docs = []
    for idx, s in enumerate(build_week(user.profile, ws)):
        session = Session(user_id=user.id, week_start=ws.isoformat(), **s)
        is_past = date.fromisoformat(session.date) < today
        if is_past and (complete_past == "all" or idx == 0):
            session.status = "completed"
            session.completed_at = completed_at(session.date, session.time)
            session.difficulty = 3
            session.shared = share
        docs.append(session.to_mongo())
    if docs:
        await db.sessions.insert_many(docs)


async def seed_all():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.sessions.create_index([("user_id", 1), ("week_start", 1)])
    await db.peer_links.create_index([("requester_id", 1), ("addressee_id", 1)])
    await db.challenges.create_index("code", unique=True)

    await ensure_user(os.environ["ADMIN_EMAIL"], os.environ["ADMIN_PASSWORD"], "CampusFit Admin",
                      "campusfit_admin", role="admin")
    demo_pw = os.environ["DEMO_PASSWORD"]
    thandi, lebo, sipho = [await ensure_user(s["email"], demo_pw, s["name"], s["username"], profile=s["profile"])
                           for s in STUDENTS]

    if not await db.peer_links.find_one({"$or": [{"requester_id": thandi.id, "addressee_id": lebo.id},
                                                 {"requester_id": lebo.id, "addressee_id": thandi.id}]}):
        await db.peer_links.insert_one(PeerLink(requester_id=lebo.id, addressee_id=thandi.id, status="accepted").to_mongo())

    today = date.today()
    current = monday_of(today)
    for weeks_back in (2, 1):
        ws = current - timedelta(weeks=weeks_back)
        await seed_week(thandi, ws, today, "all", False)
        await seed_week(lebo, ws, today, "all", True)
    await seed_week(thandi, current, today, "first", False)
    await seed_week(lebo, current, today, "all", True)
    await seed_week(sipho, current, today, "first", False)

    if not await db.challenges.find_one({"week_start": current.isoformat(), "owner_id": lebo.id}):
        code = f"FIT{current.strftime('%m%d')}"
        await db.challenges.delete_many({"code": code})
        await db.challenges.insert_one(Challenge(
            name="Three sessions this week", owner_id=lebo.id, week_start=current.isoformat(),
            target_per_member=3, member_ids=[lebo.id, thandi.id], code=code).to_mongo())
