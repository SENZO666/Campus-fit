import secrets
import string
from datetime import timedelta
from typing import Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import (DATE_PATTERN, Challenge, PeerLink, Report, Session, User, db, get_current_user, get_user,
                  parse_date, to_oid, users_by_ids)

router = APIRouter(prefix="/api")
NOT_FOUND_USER = "No student found with that username. Check the spelling and try again."
MAX_MEMBERS = 8


def blocked_between(a: User, b: User) -> bool:
    return b.id in a.blocked or a.id in b.blocked


async def find_link(a_id: str, b_id: str) -> Optional[PeerLink]:
    doc = await db.peer_links.find_one({"$or": [{"requester_id": a_id, "addressee_id": b_id},
                                                {"requester_id": b_id, "addressee_id": a_id}]})
    return PeerLink.from_mongo(doc)


async def peer_ids(user_id: str) -> set:
    docs = await db.peer_links.find({"status": "accepted", "$or": [{"requester_id": user_id}, {"addressee_id": user_id}]}).to_list(1000)
    links = [PeerLink.from_mongo(d) for d in docs]
    return {l.addressee_id if l.requester_id == user_id else l.requester_id for l in links}


async def other_user(user_id: str, me: User) -> User:
    other = await get_user(user_id)
    if not other or other.id == me.id or other.role != "student":
        raise HTTPException(404, "Student not found.")
    return other


# ---------- Lookup & requests ----------
@router.get("/users/lookup")
async def lookup(username: str, me: User = Depends(get_current_user)):
    uname = username.strip().lower().lstrip("@")
    other = User.from_mongo(await db.users.find_one({"username": uname, "role": "student"}))
    if not other or other.id == me.id or me.id in other.blocked:
        raise HTTPException(404, NOT_FOUND_USER)
    link = await find_link(me.id, other.id)
    if other.id in me.blocked:
        relation = "blocked"
    elif not link:
        relation = "none"
    elif link.status == "accepted":
        relation = "peers"
    else:
        relation = "outgoing" if link.requester_id == me.id else "incoming"
    return {**other.brief(), "relation": relation, "link_id": link.id if link else None,
            "accepts_requests": other.privacy.allow_requests}


class RequestIn(BaseModel):
    username: str


@router.post("/peers/requests")
async def send_request(body: RequestIn, me: User = Depends(get_current_user)):
    uname = body.username.strip().lower().lstrip("@")
    other = User.from_mongo(await db.users.find_one({"username": uname, "role": "student"}))
    if not other or other.id == me.id or me.id in other.blocked:
        raise HTTPException(404, NOT_FOUND_USER)
    if other.id in me.blocked:
        raise HTTPException(400, "You've blocked this student. Unblock them in Settings first.")
    if not other.privacy.allow_requests:
        raise HTTPException(400, "This student isn't accepting peer requests right now.")
    if await find_link(me.id, other.id):
        raise HTTPException(400, "You already have a request or connection with this student.")
    link = PeerLink(requester_id=me.id, addressee_id=other.id)
    await db.peer_links.insert_one(link.to_mongo())
    return {"ok": True}


@router.get("/peers")
async def list_peers(me: User = Depends(get_current_user)):
    docs = await db.peer_links.find({"$or": [{"requester_id": me.id}, {"addressee_id": me.id}]}).to_list(1000)
    links = [PeerLink.from_mongo(d) for d in docs]
    other_ids = [l.addressee_id if l.requester_id == me.id else l.requester_id for l in links]
    users = await users_by_ids(other_ids)
    out = {"peers": [], "incoming": [], "outgoing": []}
    for link, oid in zip(links, other_ids):
        u = users.get(oid)
        if not u:
            continue
        entry = {"link_id": link.id, "user": u.brief(), "muted": u.id in me.muted, "since": link.created_at}
        if link.status == "accepted":
            out["peers"].append(entry)
        elif link.requester_id == me.id:
            out["outgoing"].append(entry)
        else:
            out["incoming"].append(entry)
    out["peers"].sort(key=lambda e: e["user"]["name"].lower())
    return out


async def own_link(link_id: str, me: User) -> PeerLink:
    link = PeerLink.from_mongo(await db.peer_links.find_one({"_id": to_oid(link_id)}))
    if not link or me.id not in (link.requester_id, link.addressee_id):
        raise HTTPException(404, "Request not found.")
    return link


@router.post("/peers/requests/{link_id}/accept")
async def accept_request(link_id: str, me: User = Depends(get_current_user)):
    link = await own_link(link_id, me)
    if link.addressee_id != me.id or link.status != "pending":
        raise HTTPException(400, "This request can't be accepted.")
    await db.peer_links.update_one({"_id": ObjectId(link.id)}, {"$set": {"status": "accepted"}})
    return {"ok": True}


@router.post("/peers/requests/{link_id}/decline")
async def decline_request(link_id: str, me: User = Depends(get_current_user)):
    link = await own_link(link_id, me)
    if link.addressee_id != me.id or link.status != "pending":
        raise HTTPException(400, "This request can't be declined.")
    await db.peer_links.delete_one({"_id": ObjectId(link.id)})
    return {"ok": True}


@router.delete("/peers/links/{link_id}")
async def remove_link(link_id: str, me: User = Depends(get_current_user)):
    link = await own_link(link_id, me)
    await db.peer_links.delete_one({"_id": ObjectId(link.id)})
    return {"ok": True}


# ---------- Mute / block ----------
@router.post("/users/{user_id}/mute")
async def mute(user_id: str, me: User = Depends(get_current_user)):
    other = await other_user(user_id, me)
    await db.users.update_one({"_id": ObjectId(me.id)}, {"$addToSet": {"muted": other.id}})
    return {"ok": True}


@router.delete("/users/{user_id}/mute")
async def unmute(user_id: str, me: User = Depends(get_current_user)):
    await db.users.update_one({"_id": ObjectId(me.id)}, {"$pull": {"muted": user_id}})
    return {"ok": True}


@router.post("/users/{user_id}/block")
async def block(user_id: str, me: User = Depends(get_current_user)):
    other = await other_user(user_id, me)
    await db.users.update_one({"_id": ObjectId(me.id)}, {"$addToSet": {"blocked": other.id}})
    await db.peer_links.delete_many({"$or": [{"requester_id": me.id, "addressee_id": other.id},
                                             {"requester_id": other.id, "addressee_id": me.id}]})
    await db.challenges.update_many({"member_ids": me.id}, {"$pull": {"invited_ids": other.id}})
    await db.challenges.update_many({"member_ids": other.id}, {"$pull": {"invited_ids": me.id}})
    return {"ok": True}


@router.delete("/users/{user_id}/block")
async def unblock(user_id: str, me: User = Depends(get_current_user)):
    await db.users.update_one({"_id": ObjectId(me.id)}, {"$pull": {"blocked": user_id}})
    return {"ok": True}


# ---------- Feed & reactions ----------
@router.get("/feed")
async def feed(me: User = Depends(get_current_user)):
    peers = await peer_ids(me.id)
    visible = [p for p in peers if p not in me.muted and p not in me.blocked] + [me.id]
    docs = await db.sessions.find({"user_id": {"$in": visible}, "status": "completed", "shared": True}) \
        .sort("completed_at", -1).to_list(30)
    sessions = [Session.from_mongo(d) for d in docs]
    users = await users_by_ids([s.user_id for s in sessions])
    return [{
        "id": s.id, "user": users[s.user_id].brief(), "title": s.title, "duration_min": s.duration_min,
        "completed_at": s.completed_at, "exercise_count": len(s.items), "reactions_count": len(s.reactions),
        "reacted_by_me": me.id in s.reactions, "is_mine": s.user_id == me.id,
    } for s in sessions if s.user_id in users]


@router.post("/sessions/{session_id}/react")
async def react(session_id: str, me: User = Depends(get_current_user)):
    session = Session.from_mongo(await db.sessions.find_one({"_id": to_oid(session_id)}))
    if not session or session.status != "completed" or not session.shared or session.user_id == me.id:
        raise HTTPException(404, "Shared workout not found.")
    owner = await get_user(session.user_id)
    if not owner or blocked_between(me, owner) or owner.id not in await peer_ids(me.id):
        raise HTTPException(403, "You can only react to workouts shared by your peers.")
    reacted = me.id not in session.reactions
    op = {"$addToSet": {"reactions": me.id}} if reacted else {"$pull": {"reactions": me.id}}
    await db.sessions.update_one({"_id": ObjectId(session.id)}, op)
    count = len(session.reactions) + (1 if reacted else -1)
    return {"reacted": reacted, "reactions_count": count}


# ---------- Challenges ----------
class ChallengeIn(BaseModel):
    name: str = Field(min_length=3, max_length=40)
    target_per_member: int = Field(ge=1, le=7)
    week_start: str = Field(pattern=DATE_PATTERN)


async def challenge_view(c: Challenge, me: User, users: dict) -> dict:
    ws = parse_date(c.week_start)
    we = (ws + timedelta(days=6)).isoformat()
    count = await db.sessions.count_documents({"user_id": {"$in": c.member_ids}, "status": "completed",
                                               "date": {"$gte": c.week_start, "$lte": we}})
    is_member = me.id in c.member_ids
    return {
        "id": c.id, "name": c.name, "week_start": c.week_start, "week_end": we,
        "target_per_member": c.target_per_member, "group_completed": count,
        "group_target": c.target_per_member * len(c.member_ids),
        "members": [users[m].brief() for m in c.member_ids if m in users],
        "invited": [users[m].brief() for m in c.invited_ids if m in users] if is_member else [],
        "is_owner": c.owner_id == me.id, "is_member": is_member,
        "code": c.code if is_member else None, "spots_left": MAX_MEMBERS - len(c.member_ids),
        "owner": users[c.owner_id].brief() if c.owner_id in users else None,
    }


async def load_challenge(challenge_id: str) -> Challenge:
    c = Challenge.from_mongo(await db.challenges.find_one({"_id": to_oid(challenge_id)}))
    if not c:
        raise HTTPException(404, "Challenge not found.")
    return c


@router.get("/challenges")
async def list_challenges(me: User = Depends(get_current_user)):
    docs = await db.challenges.find({"$or": [{"member_ids": me.id}, {"invited_ids": me.id}]}).sort("week_start", -1).to_list(200)
    challenges = [Challenge.from_mongo(d) for d in docs]
    ids = [i for c in challenges for i in c.member_ids + c.invited_ids + [c.owner_id]]
    users = await users_by_ids(ids)
    mine, invites = [], []
    for c in challenges:
        view = await challenge_view(c, me, users)
        (mine if me.id in c.member_ids else invites).append(view)
    return {"mine": mine, "invites": invites}


@router.post("/challenges")
async def create_challenge(body: ChallengeIn, me: User = Depends(get_current_user)):
    if parse_date(body.week_start).weekday() != 0:
        raise HTTPException(400, "Weeks start on Monday.")
    code = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    c = Challenge(name=body.name.strip(), owner_id=me.id, week_start=body.week_start,
                  target_per_member=body.target_per_member, member_ids=[me.id], code=code)
    result = await db.challenges.insert_one(c.to_mongo())
    c.id = str(result.inserted_id)
    return await challenge_view(c, me, {me.id: me})


class InviteIn(BaseModel):
    user_id: str


@router.post("/challenges/{challenge_id}/invite")
async def invite(challenge_id: str, body: InviteIn, me: User = Depends(get_current_user)):
    c = await load_challenge(challenge_id)
    if me.id not in c.member_ids:
        raise HTTPException(403, "Only members can invite peers.")
    other = await other_user(body.user_id, me)
    if blocked_between(me, other) or other.id not in await peer_ids(me.id):
        raise HTTPException(400, "You can only invite accepted peers.")
    if other.id in c.member_ids or other.id in c.invited_ids:
        raise HTTPException(400, "This peer is already in or invited to the challenge.")
    if len(c.member_ids) >= MAX_MEMBERS:
        raise HTTPException(400, "This challenge is full (8 members).")
    await db.challenges.update_one({"_id": ObjectId(c.id)}, {"$addToSet": {"invited_ids": other.id}})
    return {"ok": True}


@router.post("/challenges/{challenge_id}/accept")
async def accept_invite(challenge_id: str, me: User = Depends(get_current_user)):
    c = await load_challenge(challenge_id)
    if me.id not in c.invited_ids:
        raise HTTPException(400, "You don't have an invitation to this challenge.")
    if len(c.member_ids) >= MAX_MEMBERS:
        raise HTTPException(400, "This challenge is full (8 members).")
    await db.challenges.update_one({"_id": ObjectId(c.id)},
                                   {"$pull": {"invited_ids": me.id}, "$addToSet": {"member_ids": me.id}})
    return {"ok": True}


@router.post("/challenges/{challenge_id}/decline")
async def decline_invite(challenge_id: str, me: User = Depends(get_current_user)):
    c = await load_challenge(challenge_id)
    await db.challenges.update_one({"_id": ObjectId(c.id)}, {"$pull": {"invited_ids": me.id}})
    return {"ok": True}


class JoinIn(BaseModel):
    code: str = Field(min_length=4, max_length=12)


@router.post("/challenges/join")
async def join(body: JoinIn, me: User = Depends(get_current_user)):
    c = Challenge.from_mongo(await db.challenges.find_one({"code": body.code.strip().upper()}))
    owner = await get_user(c.owner_id) if c else None
    if not c or (owner and blocked_between(me, owner)):
        raise HTTPException(404, "No challenge found with that code.")
    if me.id in c.member_ids:
        raise HTTPException(400, "You're already in this challenge.")
    if len(c.member_ids) >= MAX_MEMBERS:
        raise HTTPException(400, "This challenge is full (8 members).")
    await db.challenges.update_one({"_id": ObjectId(c.id)},
                                   {"$pull": {"invited_ids": me.id}, "$addToSet": {"member_ids": me.id}})
    return {"ok": True}


@router.post("/challenges/{challenge_id}/leave")
async def leave(challenge_id: str, me: User = Depends(get_current_user)):
    c = await load_challenge(challenge_id)
    if me.id not in c.member_ids:
        raise HTTPException(400, "You're not in this challenge.")
    remaining = [m for m in c.member_ids if m != me.id]
    if not remaining:
        await db.challenges.delete_one({"_id": ObjectId(c.id)})
    else:
        update = {"member_ids": remaining}
        if c.owner_id == me.id:
            update["owner_id"] = remaining[0]
        await db.challenges.update_one({"_id": ObjectId(c.id)}, {"$set": update})
    return {"ok": True}


# ---------- Reports ----------
ReportReason = Literal["Spam or fake account", "Harassment or bullying", "Inappropriate content",
                       "Impersonation", "Something else"]


class ReportIn(BaseModel):
    user_id: str
    reason: ReportReason
    details: str = Field(default="", max_length=500)


@router.post("/reports")
async def create_report(body: ReportIn, me: User = Depends(get_current_user)):
    other = await other_user(body.user_id, me)
    report = Report(reporter_id=me.id, reported_id=other.id, reason=body.reason, details=body.details.strip())
    await db.reports.insert_one(report.to_mongo())
    return {"ok": True}
