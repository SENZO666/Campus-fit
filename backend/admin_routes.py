from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from core import Report, User, db, get_current_user, now_iso, to_oid, users_by_ids

router = APIRouter(prefix="/api/admin")


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admins only.")
    return user


@router.get("/reports")
async def list_reports(admin: User = Depends(require_admin)):
    docs = await db.reports.find({}).sort("created_at", -1).to_list(1000)
    reports = [Report.from_mongo(d) for d in docs]
    users = await users_by_ids([i for r in reports for i in (r.reporter_id, r.reported_id)])
    unknown = {"id": None, "name": "Deleted account", "username": "-"}
    return [{
        **r.model_dump(),
        "reporter": users[r.reporter_id].brief() if r.reporter_id in users else unknown,
        "reported": users[r.reported_id].brief() if r.reported_id in users else unknown,
    } for r in reports]


@router.post("/reports/{report_id}/resolve")
async def resolve(report_id: str, admin: User = Depends(require_admin)):
    result = await db.reports.update_one({"_id": to_oid(report_id)},
                                         {"$set": {"status": "resolved", "resolved_at": now_iso()}})
    if not result.matched_count:
        raise HTTPException(404, "Report not found.")
    return {"ok": True}


@router.post("/reports/{report_id}/reopen")
async def reopen(report_id: str, admin: User = Depends(require_admin)):
    await db.reports.update_one({"_id": ObjectId(report_id) if ObjectId.is_valid(report_id) else None},
                                {"$set": {"status": "open", "resolved_at": None}})
    return {"ok": True}
