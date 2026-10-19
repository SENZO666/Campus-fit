# CampusFit Planner API regression tests (auth, plan, sessions, progress, social, challenges, admin)
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
PW = "Student#2026"
TODAY = date(2026, 10, 19) if date.today() < date(2026, 10, 19) else date.today()
TODAY_S = TODAY.isoformat()
WS = (TODAY - timedelta(days=TODAY.weekday())).isoformat()
NONE_EQUIP_BAD = {"basic", "full"}


def login(email, pw=PW):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return s, r


@pytest.fixture(scope="module")
def exercises():
    r = requests.get(f"{BASE_URL}/api/exercises")
    assert r.status_code == 200
    return {e["id"]: e for e in r.json()}


@pytest.fixture(scope="module")
def new_user():
    s = requests.Session()
    uid = uuid.uuid4().hex[:8]
    r = s.post(f"{BASE_URL}/api/auth/register", json={"email": f"test_{uid}@example.com", "password": "Testpass#1",
                                                       "name": "TEST User", "username": f"test_{uid}"})
    assert r.status_code == 200, r.text
    return s, r.json()


PROFILE = {"goal": "habit", "level": "beginner", "session_length": 20, "equipment": "none", "place": "residence",
           "days": [{"day": d, "time": "18:00"} for d in range(7)]}


# ---------- Auth ----------
class TestAuth:
    def test_root(self):
        assert requests.get(f"{BASE_URL}/api/").status_code == 200

    def test_login_cookies_httponly(self):
        s, r = login("thandi@campusfit.app")
        sc = r.headers.get("set-cookie", "")
        assert "access_token" in sc and "HttpOnly" in sc and "refresh_token" in sc
        assert r.json()["username"] == "thandi_m"
        assert "password_hash" not in r.json() and "_id" not in r.json()
        assert s.get(f"{BASE_URL}/api/auth/me").json()["email"] == "thandi@campusfit.app"
        assert s.post(f"{BASE_URL}/api/auth/refresh").status_code == 200

    def test_admin_login(self):
        s, r = login("admin@campusfit.app", "Admin#2026")
        assert r.json()["role"] == "admin"

    def test_bruteforce_lockout_throwaway(self):
        email = f"nobody_{uuid.uuid4().hex[:6]}@example.com"
        codes = [requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "x"}).status_code
                 for _ in range(6)]
        assert codes[:5] == [401] * 5 and codes[5] == 429

    def test_register_validation(self, new_user):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={"email": "bad", "password": "1", "name": "", "username": "x"})
        assert r.status_code == 422
        r = requests.post(f"{BASE_URL}/api/auth/register", json={"email": f"x{uuid.uuid4().hex[:5]}@example.com",
                                                                 "password": "Testpass#1", "name": "A", "username": "thandi_m"})
        assert r.status_code == 400 and "username is taken" in r.json()["detail"]
        assert new_user[1]["onboarded"] is False

    def test_logout(self):
        s, _ = login("sipho@campusfit.app")
        s.post(f"{BASE_URL}/api/auth/logout")
        assert s.get(f"{BASE_URL}/api/auth/me").status_code == 401

    def test_bcrypt_hash(self):
        from pymongo import MongoClient
        c = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        doc = c[os.environ.get("DB_NAME", "test_database")].users.find_one({"email": "admin@campusfit.app"})
        assert doc["password_hash"].startswith("$2b$")


# ---------- Plan builder ----------
class TestPlan:
    def test_profile_and_preview_no_equipment(self, new_user, exercises):
        s, _ = new_user
        r = s.put(f"{BASE_URL}/api/me/profile", json=PROFILE)
        assert r.status_code == 200 and r.json()["onboarded"] is True
        r = s.post(f"{BASE_URL}/api/plan/preview", json={"profile": PROFILE, "week_start": WS, "today": TODAY_S})
        assert r.status_code == 200
        week = r.json()
        assert len(week) >= 1
        for sess in week:
            assert sess["date"] >= TODAY_S
            for it in sess["items"]:
                assert exercises[it["exercise_id"]]["equipment"] not in NONE_EQUIP_BAD

    def test_profile_requires_day(self, new_user):
        s, _ = new_user
        assert s.put(f"{BASE_URL}/api/me/profile", json={**PROFILE, "days": []}).status_code == 422

    def test_build_session_lengths(self, new_user, exercises):
        s, _ = new_user
        for d in (10, 60):
            r = s.post(f"{BASE_URL}/api/plan/session", json={"template": "cardio", "duration_min": d})
            assert r.status_code == 200, r.text
            assert r.json()["duration_min"] == d
            assert all(exercises[i["exercise_id"]]["equipment"] == "none" for i in r.json()["items"])
        assert s.post(f"{BASE_URL}/api/plan/session", json={"template": "cardio", "duration_min": 65}).status_code == 422
        assert s.post(f"{BASE_URL}/api/plan/session", json={"template": "cardio", "duration_min": 5}).status_code == 422

    def test_alternatives_no_equipment(self, new_user, exercises):
        s, _ = new_user
        some = next(iter(exercises))
        r = s.get(f"{BASE_URL}/api/exercises/{some}/alternatives")
        assert r.status_code == 200
        alts = r.json()
        alts = alts if isinstance(alts, list) else alts.get("similar", []) + alts.get("library", [])
        for a in alts:
            ex = a if "equipment" in a else exercises[a.get("id") or a.get("exercise_id")]
            assert ex["equipment"] == "none"

    def test_save_week_and_get(self, new_user):
        s, _ = new_user
        week = s.post(f"{BASE_URL}/api/plan/preview", json={"profile": PROFILE, "week_start": WS, "today": TODAY_S}).json()
        payload = [{k: x[k] for k in ("date", "time", "template", "title", "duration_min", "items")} for x in week]
        r = s.put(f"{BASE_URL}/api/weeks/{WS}", json={"sessions": payload, "today": TODAY_S})
        assert r.status_code == 200, r.text
        got = s.get(f"{BASE_URL}/api/weeks/{WS}").json()
        assert len(got) == len(payload) and all(g["status"] == "planned" for g in got)
        # past date rejected
        bad = dict(payload[0], date=(TODAY - timedelta(days=1)).isoformat())
        assert s.put(f"{BASE_URL}/api/weeks/{WS}", json={"sessions": [bad], "today": TODAY_S}).status_code == 400
        # non-Monday rejected
        assert s.get(f"{BASE_URL}/api/weeks/{(TODAY + timedelta(days=1)).isoformat()}").status_code == 400

    def test_reschedule_skip_complete_share_progress(self, new_user):
        s, _ = new_user
        sessions = s.get(f"{BASE_URL}/api/weeks/{WS}").json()
        sid = sessions[0]["id"]
        target = (TODAY + timedelta(days=2)).isoformat()
        r = s.patch(f"{BASE_URL}/api/sessions/{sid}/reschedule", json={"date": target, "time": "09:15", "today": TODAY_S})
        assert r.status_code == 200 and r.json()["date"] == target and r.json()["time"] == "09:15"
        r = s.patch(f"{BASE_URL}/api/sessions/{sid}/reschedule",
                    json={"date": (TODAY - timedelta(days=1)).isoformat(), "time": "09:15", "today": TODAY_S})
        assert r.status_code == 400 and "today or a later" in r.json()["detail"]
        sid2 = sessions[1]["id"]
        assert s.post(f"{BASE_URL}/api/sessions/{sid2}/skip").json()["status"] == "skipped"
        r = s.post(f"{BASE_URL}/api/sessions/{sid}/complete", json={"difficulty": 3})
        assert r.status_code == 200 and r.json()["status"] == "completed" and r.json()["shared"] is False
        assert s.post(f"{BASE_URL}/api/sessions/{sid}/complete", json={}).status_code == 400
        assert s.patch(f"{BASE_URL}/api/sessions/{sid}/share", json={"shared": True}).json()["shared"] is True
        p = s.get(f"{BASE_URL}/api/progress", params={"today": TODAY_S}).json()
        assert p["total_completed"] == 1 and p["streak_weeks"] == 1 and len(p["weekly"]) == 8
        # clear week keeps completed
        assert s.delete(f"{BASE_URL}/api/weeks/{WS}").status_code == 200
        left = s.get(f"{BASE_URL}/api/weeks/{WS}").json()
        assert [x["status"] for x in left] == ["completed"]
        # regenerate
        r = s.post(f"{BASE_URL}/api/weeks/{WS}/regenerate", json={"today": TODAY_S})
        assert r.status_code == 200 and len(r.json()) >= 2

    def test_other_user_session_404(self, new_user):
        s, _ = login("lebo@campusfit.app")
        ns, _ = new_user
        sid = ns.get(f"{BASE_URL}/api/weeks/{WS}").json()[0]["id"]
        assert s.get(f"{BASE_URL}/api/sessions/{sid}").status_code == 404

    def test_privacy_and_account(self, new_user):
        s, u = new_user
        r = s.put(f"{BASE_URL}/api/me/privacy", json={"share_by_default": True, "allow_requests": False, "show_streaks": False})
        assert r.json()["privacy"]["show_streaks"] is False
        assert s.get(f"{BASE_URL}/api/progress", params={"today": TODAY_S}).json()["show_streaks"] is False
        r = s.put(f"{BASE_URL}/api/me/account", json={"name": "TEST Renamed", "username": "lebo_k"})
        assert r.status_code == 400
        r = s.put(f"{BASE_URL}/api/me/account", json={"name": "TEST Renamed", "username": u["username"]})
        assert r.status_code == 200 and r.json()["name"] == "TEST Renamed"


# ---------- Social ----------
class TestSocial:
    def test_lookup_and_feed(self):
        s, _ = login("thandi@campusfit.app")
        r = s.get(f"{BASE_URL}/api/users/lookup", params={"username": "lebo_k"})
        assert r.status_code == 200 and r.json()["relation"] == "peers"
        assert s.get(f"{BASE_URL}/api/users/lookup", params={"username": "nope_zz"}).status_code == 404
        feed = s.get(f"{BASE_URL}/api/feed").json()
        lebo_items = [f for f in feed if f["user"]["username"] == "lebo_k"]
        assert lebo_items, "Expected lebo shared workouts in thandi feed"
        fid = lebo_items[0]["id"]
        r1 = s.post(f"{BASE_URL}/api/sessions/{fid}/react").json()
        r2 = s.post(f"{BASE_URL}/api/sessions/{fid}/react").json()
        assert r1["reacted"] != r2["reacted"]

    def test_peer_request_flow(self, new_user):
        ns, nu = new_user
        # new user had allow_requests False from privacy test -> should be refused
        s, _ = login("sipho@campusfit.app")
        r = s.post(f"{BASE_URL}/api/peers/requests", json={"username": nu["username"]})
        assert r.status_code == 400
        ns.put(f"{BASE_URL}/api/me/privacy", json={"share_by_default": False, "allow_requests": True, "show_streaks": True})
        r = s.post(f"{BASE_URL}/api/peers/requests", json={"username": nu["username"]})
        assert r.status_code == 200
        incoming = ns.get(f"{BASE_URL}/api/peers").json()["incoming"]
        assert incoming and incoming[0]["user"]["username"] == "sipho_d"
        assert ns.post(f"{BASE_URL}/api/peers/requests/{incoming[0]['link_id']}/accept").status_code == 200
        peers = s.get(f"{BASE_URL}/api/peers").json()["peers"]
        assert nu["username"] in [p["user"]["username"] for p in peers]
        # mute/block/report then cleanup
        sid = nu["id"]
        assert s.post(f"{BASE_URL}/api/users/{sid}/mute").status_code == 200
        hidden = s.get(f"{BASE_URL}/api/me/hidden").json()
        assert any(h["id"] == sid and h["muted"] for h in hidden)
        r = s.post(f"{BASE_URL}/api/reports", json={"user_id": sid, "reason": "Spam or fake account", "details": "TEST report"})
        assert r.status_code == 200
        assert s.post(f"{BASE_URL}/api/users/{sid}/block").status_code == 200
        assert nu["username"] not in [p["user"]["username"] for p in s.get(f"{BASE_URL}/api/peers").json()["peers"]]
        assert ns.get(f"{BASE_URL}/api/users/lookup", params={"username": "sipho_d"}).status_code == 404
        s.delete(f"{BASE_URL}/api/users/{sid}/block")
        s.delete(f"{BASE_URL}/api/users/{sid}/mute")

    def test_challenges(self, new_user):
        ns, nu = new_user
        s, _ = login("thandi@campusfit.app")
        mine = s.get(f"{BASE_URL}/api/challenges").json()["mine"]
        seeded = [c for c in mine if c["name"] == "Three sessions this week"]
        assert seeded and seeded[0]["group_target"] == 6
        assert "leaderboard" not in str(seeded[0]).lower()
        r = ns.post(f"{BASE_URL}/api/challenges", json={"name": "TEST challenge", "target_per_member": 2, "week_start": WS})
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["code"] and c["group_target"] == 2
        assert s.post(f"{BASE_URL}/api/challenges/join", json={"code": "ZZZZZZ"}).status_code == 404
        assert s.post(f"{BASE_URL}/api/challenges/join", json={"code": c["code"]}).status_code == 200
        assert s.post(f"{BASE_URL}/api/challenges/join", json={"code": c["code"]}).status_code == 400
        # thandi leaves, owner leaves -> deleted
        assert s.post(f"{BASE_URL}/api/challenges/{c['id']}/leave").status_code == 200
        assert ns.post(f"{BASE_URL}/api/challenges/{c['id']}/leave").status_code == 200
        # invite non-peer refused
        assert ns.post(f"{BASE_URL}/api/challenges/{seeded[0]['id']}/invite", json={"user_id": nu["id"]}).status_code == 403


# ---------- Admin ----------
class TestAdmin:
    def test_admin_reports(self):
        a, _ = login("admin@campusfit.app", "Admin#2026")
        reports = a.get(f"{BASE_URL}/api/admin/reports").json()
        test_reports = [r for r in reports if r["details"] == "TEST report"]
        assert test_reports and test_reports[0]["reporter"]["username"] == "sipho_d"
        rid = test_reports[0]["id"]
        assert a.post(f"{BASE_URL}/api/admin/reports/{rid}/resolve").status_code == 200
        assert [r for r in a.get(f"{BASE_URL}/api/admin/reports").json() if r["id"] == rid][0]["status"] == "resolved"
        assert a.post(f"{BASE_URL}/api/admin/reports/{'0' * 24}/resolve").status_code == 404

    def test_non_admin_forbidden(self):
        s, _ = login("thandi@campusfit.app")
        assert s.get(f"{BASE_URL}/api/admin/reports").status_code == 403
