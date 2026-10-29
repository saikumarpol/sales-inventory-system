
import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app import models
from app.database import (
    Base,
    SessionLocal,
    check_database_connection,
    engine,
)
from app.dependencies import get_current_user
from app.models import User
from app.routers import auth, customers, orders, products

app = FastAPI(
    title="Sales & Inventory Management System",
    description="API for products, customers, sales orders and inventory.",
    version="1.0.0",
)

# Allow requests from the local React/Vite frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication routes are public; protected routes require a JWT.
app.include_router(auth.router)

app.include_router(
    products.router,
    dependencies=[Depends(get_current_user)],
)

app.include_router(
    customers.router,
    dependencies=[Depends(get_current_user)],
)

app.include_router(orders.router)


def create_manager_account():
    email = os.getenv("MANAGER_EMAIL", "").strip().lower()
    password = os.getenv("MANAGER_PASSWORD", "")

    if not email or not password:
        print(
            "Manager account not provisioned: "
            "set MANAGER_EMAIL and MANAGER_PASSWORD."
        )
        return

    password_hash = PasswordHash.recommended()

    with SessionLocal() as db:
        manager = db.query(User).filter(User.email == email).first()

        if manager is None:
            manager = User(
                name="Manager",
                email=email,
                hashed_password=password_hash.hash(password),
                role="manager",
                is_active=True,
            )
            db.add(manager)
        else:
            manager.role = "manager"
            manager.hashed_password = password_hash.hash(password)
            manager.is_active = True

        db.commit()


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    create_manager_account()


@app.get("/")
def home():
    return {
        "message": "Sales & Inventory Management API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/health/db")
def database_health():
    try:
        check_database_connection()
        return {
            "status": "connected",
            "database": "sales_inventory",
        }
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed",
        )
