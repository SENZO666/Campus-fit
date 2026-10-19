from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import logging  # noqa: E402
import os  # noqa: E402

from fastapi import FastAPI  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

import admin_routes  # noqa: E402
import auth_routes  # noqa: E402
import plan_routes  # noqa: E402
import social_routes  # noqa: E402
from core import client  # noqa: E402
from seed import seed_all  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

app = FastAPI(title="CampusFit Planner API")


@app.get("/api/")
async def root():
    return {"message": "CampusFit Planner API"}


for module in (auth_routes, plan_routes, social_routes, admin_routes):
    app.include_router(module.router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ["CORS_ORIGINS"].split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await seed_all()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
