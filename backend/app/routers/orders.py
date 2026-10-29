
import logging
import os

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_manager, get_current_user
from app.models import User
from app.order_service import (
    create_sales_order,
    decide_sales_order,
    get_sales_order,
    list_sales_orders,
)
from app.schemas import SalesOrderCreate, SalesOrderResponse
from app.services.email_service import (
    notify_manager_order_pending,
    notify_order_decision,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orders", tags=["Sales Orders"])


@router.post(
    "/",
    response_model=SalesOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    payload: SalesOrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = create_sales_order(
        db=db,
        customer_id=payload.customer_id,
        items=payload.items,
        created_by_user_id=user.id,
    )

    if order.status == "PENDING_APPROVAL":
        manager_email = os.getenv("MANAGER_EMAIL", "").strip()

        if not manager_email:
            logger.error(
                "Manager notification skipped: MANAGER_EMAIL is not configured."
            )
        else:
            notify_manager_order_pending(
                manager_email=manager_email,
                order_id=order.id,
                total_amount=float(order.total_amount),
            )

    return order


@router.get("/", response_model=list[SalesOrderResponse])
def get_orders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_sales_orders(db)


@router.get("/{order_id}", response_model=SalesOrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_sales_order(db, order_id)


@router.post("/{order_id}/approve", response_model=SalesOrderResponse)
def approve_order(
    order_id: int,
    db: Session = Depends(get_db),
    manager: User = Depends(get_current_manager),
):
    order = decide_sales_order(db, order_id, approve=True)

    if order.creator and order.creator.email:
        notify_order_decision(
            creator_email=order.creator.email,
            order_id=order.id,
            decision="approved",
            total_amount=float(order.total_amount),
        )
    else:
        logger.warning(
            "Approval email skipped for order %s: creator email is unavailable.",
            order.id,
        )

    return order


@router.post("/{order_id}/reject", response_model=SalesOrderResponse)
def reject_order(
    order_id: int,
    db: Session = Depends(get_db),
    manager: User = Depends(get_current_manager),
):
    order = decide_sales_order(db, order_id, approve=False)

    if order.creator and order.creator.email:
        notify_order_decision(
            creator_email=order.creator.email,
            order_id=order.id,
            decision="rejected",
            total_amount=float(order.total_amount),
        )
    else:
        logger.warning(
            "Rejection email skipped for order %s: creator email is unavailable.",
            order.id,
        )

    return order
