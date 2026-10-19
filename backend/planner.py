"""Rule-based weekly plan builder (goal + level + equipment + place + time)."""
from collections import defaultdict
from datetime import date, timedelta
from typing import Optional

from exercises_data import EXERCISES, EXERCISE_MAP

EQUIP_RANK = {"none": 0, "basic": 1, "full": 2}
LEVEL_RANK = {"beginner": 0, "intermediate": 1, "advanced": 2}
LEVEL_SETTINGS = {
    "beginner": {"sets": 2, "rest": 60, "mult": 1.0},
    "intermediate": {"sets": 3, "rest": 45, "mult": 1.25},
    "advanced": {"sets": 3, "rest": 30, "mult": 1.5},
}
MAX_ITEMS = 9

TEMPLATES = {
    "full_body": {"title": "Full body", "description": "A bit of everything: legs, push, pull and core.",
                  "focus": ["legs", "chest", "back", "glutes", "core", "shoulders"]},
    "upper": {"title": "Upper body", "description": "Chest, back, shoulders and arms.",
              "focus": ["chest", "back", "shoulders", "arms", "core"]},
    "lower": {"title": "Lower body", "description": "Legs and glutes with some core.",
              "focus": ["legs", "glutes", "legs", "glutes", "core"]},
    "cardio": {"title": "Cardio intervals", "description": "Short bursts to raise your heart rate.",
               "focus": ["cardio", "legs", "cardio", "core", "cardio"]},
    "core": {"title": "Core and stability", "description": "Core, glutes and posture.",
             "focus": ["core", "glutes", "core", "back", "mobility"]},
    "mobility": {"title": "Mobility flow", "description": "Gentle stretches to move better.",
                 "focus": ["mobility"]},
}

GOAL_ROTATION = {
    "habit": ["full_body", "cardio", "mobility"],
    "strength": ["full_body", "upper", "lower"],
    "fitness": ["cardio", "full_body", "core"],
    "mobility": ["mobility", "core", "full_body"],
}


def allowed(profile, ignore_level: bool = False):
    eq = EQUIP_RANK[profile.equipment]
    if profile.place != "gym":
        eq = min(eq, 1)  # machines and barbells only at a gym
    lvl = LEVEL_RANK[profile.level]
    return [
        e for e in EXERCISES
        if EQUIP_RANK[e["equipment"]] <= eq
        and (ignore_level or LEVEL_RANK[e["difficulty"]] <= lvl)
        and (profile.place != "residence" or e["quiet"])
    ]


def make_item(ex: dict, level: str) -> dict:
    cfg = LEVEL_SETTINGS[level]
    item = {"exercise_id": ex["id"], "sets": cfg["sets"], "rest_sec": cfg["rest"], "reps": None, "duration_sec": None}
    if ex["mode"] == "time":
        item["duration_sec"] = int(round(ex["base"] * cfg["mult"] / 5) * 5)
    else:
        item["reps"] = int(round(ex["base"] * cfg["mult"]))
    if ex["group"] == "mobility":
        item["sets"], item["rest_sec"] = 1, 15
    return item


def item_seconds(item: dict) -> int:
    work = item["duration_sec"] or item["reps"] * 3
    return item["sets"] * (work + item["rest_sec"])


def build_session(profile, template: str, duration_min: int, offset: int = 0, keep_ids=()) -> dict:
    tpl = TEMPLATES[template]
    pool = allowed(profile)
    allowed_ids = {e["id"] for e in pool}
    groups = defaultdict(list)
    for e in pool:
        groups[e["group"]].append(e)
    for g, lst in groups.items():
        k = offset % len(lst)
        groups[g] = lst[k:] + lst[:k]

    target = duration_min * 60
    items, used = [], set()

    def total():
        return sum(item_seconds(i) for i in items)

    def add(e):
        items.append(make_item(e, profile.level))
        used.add(e["id"])

    for kid in keep_ids:
        if kid in allowed_ids and kid not in used:
            candidate = make_item(EXERCISE_MAP[kid], profile.level)
            if items and total() + item_seconds(candidate) > target * 1.05:
                break
            items.append(candidate)
            used.add(kid)

    if not items and template != "mobility" and groups.get("mobility"):
        add(groups["mobility"][0])

    focus, i, misses = tpl["focus"], 0, 0
    while total() < target * 0.9 and len(items) < MAX_ITEMS and misses < len(focus):
        g = focus[i % len(focus)]
        i += 1
        cand = next((e for e in groups.get(g, []) if e["id"] not in used), None)
        if cand:
            add(cand)
            misses = 0
        else:
            misses += 1

    main = [it for it in items if EXERCISE_MAP[it["exercise_id"]]["group"] != "mobility"] or items
    j = 0
    while main and total() < target * 0.9 and j < 60:
        it = main[j % len(main)]
        if it["sets"] < 5:
            it["sets"] += 1
        j += 1

    return {"template": template, "title": tpl["title"], "duration_min": duration_min, "items": items}


def build_week(profile, week_start: Optional[date] = None, today: Optional[date] = None) -> list:
    rotation = GOAL_ROTATION[profile.goal]
    out = []
    for idx, d in enumerate(sorted(profile.days, key=lambda x: x.day)):
        session = build_session(profile, rotation[idx % len(rotation)], profile.session_length, offset=idx)
        session["day"] = d.day
        session["time"] = d.time
        if week_start:
            dt = week_start + timedelta(days=d.day)
            if today and dt < today:
                continue
            session["date"] = dt.isoformat()
        out.append(session)
    return out


def with_item(profile, exercises: list) -> list:
    level = profile.level if profile else "beginner"
    return [{**e, "suggested_item": make_item(e, level)} for e in exercises]


def alternatives(profile, exercise_id: str) -> list:
    ex = EXERCISE_MAP[exercise_id]
    pool = allowed(profile) if profile else EXERCISES
    alts = [e for e in pool if e["group"] == ex["group"] and e["id"] != exercise_id]
    if not alts and profile:
        alts = [e for e in allowed(profile, ignore_level=True) if e["group"] == ex["group"] and e["id"] != exercise_id]
    return with_item(profile, alts)


def suitable(profile) -> list:
    return with_item(profile, allowed(profile) if profile else EXERCISES)
