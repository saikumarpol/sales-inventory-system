
import os
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Customer,
    Product,
    SalesOrder,
    SalesOrderItem,
    User,
)


def _get_approval_threshold() -> Decimal:
    """Read the order approval threshold from the environment."""
    return Decimal(os.getenv("APPROVAL_THRESHOLD", "50000.00"))


def _load_order(db: Session, order_id: int) -> SalesOrder:
    """Load an order with its items and creator."""
    statement = (
        select(SalesOrder)
        .where(SalesOrder.id == order_id)
        .options(
            selectinload(SalesOrder.items),
            selectinload(SalesOrder.creator),
        )
    )

    order = db.execute(statement).scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Sales order not found",
        )

    return order


def create_sales_order(
    db: Session,
    customer_id: int,
    items: list,
    created_by_user_id: int | None = None,
) -> SalesOrder:
    """
    Create a sales order.

    - Orders above the threshold require manager approval.
    - Pending orders reserve stock.
    - Lower-value orders deduct stock immediately.
    - The logged-in creator is saved when supplied.
    """
    if not items:
        raise HTTPException(
            status_code=422,
            detail="An order must contain at least one item",
        )

    try:
        customer = db.get(Customer, customer_id)

        if customer is None:
            raise HTTPException(
                status_code=404,
                detail="Customer not found",
            )

        if created_by_user_id is not None:
            creator = db.get(User, created_by_user_id)

            if creator is None:
                raise HTTPException(
                    status_code=404,
                    detail="Order creator not found",
                )

            if not creator.is_active:
                raise HTTPException(
                    status_code=403,
                    detail="Inactive users cannot create orders",
                )

        # Combine duplicate product IDs before checking stock.
        quantities: dict[int, int] = {}

        for item in items:
            product_id = int(item.product_id)
            quantity = int(item.quantity)

            if product_id <= 0:
                raise HTTPException(
                    status_code=422,
                    detail="Product ID must be positive",
                )

            if quantity <= 0:
                raise HTTPException(
                    status_code=422,
                    detail="Item quantity must be greater than zero",
                )

            quantities[product_id] = (
                quantities.get(product_id, 0) + quantity
            )

        products: dict[int, Product] = {}
        total_amount = Decimal("0.00")

        # Lock product rows while validating available stock.
        # This helps prevent concurrent orders from overselling inventory.
        for product_id in sorted(quantities):
            quantity = quantities[product_id]

            product = db.execute(
                select(Product)
                .where(Product.id == product_id)
                .with_for_update()
            ).scalar_one_or_none()

            if product is None or not product.is_active:
                raise HTTPException(
                    status_code=404,
                    detail=f"Active product {product_id} not found",
                )

            available_stock = (
                product.stock_quantity - product.reserved_quantity
            )

            if available_stock < 0:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Inventory data is inconsistent for {product.name}"
                    ),
                )

            if quantity > available_stock:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Insufficient available stock for {product.name}. "
                        f"Available: {available_stock}, requested: {quantity}"
                    ),
                )

            products[product_id] = product
            total_amount += Decimal(str(product.price)) * quantity

        threshold = _get_approval_threshold()
        requires_approval = total_amount > threshold

        order = SalesOrder(
            customer_id=customer_id,
            created_by_user_id=created_by_user_id,
            total_amount=total_amount,
            status=(
                "PENDING_APPROVAL"
                if requires_approval
                else "CONFIRMED"
            ),
            requires_approval=requires_approval,
        )

        db.add(order)
        db.flush()

        for product_id, quantity in quantities.items():
            product = products[product_id]
            unit_price = Decimal(str(product.price))
            line_total = unit_price * quantity

            if requires_approval:
                product.reserved_quantity += quantity
            else:
                product.stock_quantity -= quantity

            db.add(
                SalesOrderItem(
                    order_id=order.id,
                    product_id=product_id,
                    quantity=quantity,
                    unit_price=unit_price,
                    line_total=line_total,
                )
            )

        order_id = order.id
        db.commit()

        return _load_order(db, order_id)

    except Exception:
        db.rollback()
        raise


def decide_sales_order(
    db: Session,
    order_id: int,
    approve: bool,
) -> SalesOrder:
    """
    Approve or reject a pending order.

    Approval:
      - Releases reserved stock.
      - Deducts the approved quantities from physical stock.

    Rejection:
      - Releases reserved stock.
      - Does not deduct physical stock.
    """
    try:
        order = db.execute(
            select(SalesOrder)
            .where(SalesOrder.id == order_id)
            .with_for_update()
        ).scalar_one_or_none()

        if order is None:
            raise HTTPException(
                status_code=404,
                detail="Sales order not found",
            )

        if order.status != "PENDING_APPROVAL":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Order is not pending approval. "
                    f"Current status: {order.status}"
                ),
            )

        items = db.execute(
            select(SalesOrderItem)
            .where(SalesOrderItem.order_id == order_id)
            .order_by(SalesOrderItem.product_id)
        ).scalars().all()

        if not items:
            raise HTTPException(
                status_code=409,
                detail="Cannot decide an order without items",
            )

        products: dict[int, Product] = {}

        # Validate all products and reservations before modifying inventory.
        for item in items:
            if item.product_id in products:
                continue

            product = db.execute(
                select(Product)
                .where(Product.id == item.product_id)
                .with_for_update()
            ).scalar_one_or_none()

            if product is None:
                raise HTTPException(
                    status_code=409,
                    detail=f"Product {item.product_id} not found",
                )

            products[product.id] = product

        required_by_product: dict[int, int] = {}

        for item in items:
            required_by_product[item.product_id] = (
                required_by_product.get(item.product_id, 0)
                + item.quantity
            )

        for product_id, quantity in required_by_product.items():
            product = products[product_id]

            if product.reserved_quantity < quantity:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Invalid inventory reservation for product "
                        f"{product_id}. Reserved: {product.reserved_quantity}, "
                        f"required: {quantity}"
                    ),
                )

            if approve and product.stock_quantity < quantity:
                raise HTTPException(
                    status_code=409,
                    detail=f"Insufficient physical stock for {product.name}",
                )

        # Apply changes only after every reservation has been validated.
        for product_id, quantity in required_by_product.items():
            product = products[product_id]
            product.reserved_quantity -= quantity

            if approve:
                product.stock_quantity -= quantity

        order.status = "APPROVED" if approve else "REJECTED"

        db.commit()

        return _load_order(db, order_id)

    except Exception:
        db.rollback()
        raise


def get_sales_order(
    db: Session,
    order_id: int,
) -> SalesOrder:
    """Retrieve one order with its items and creator."""
    return _load_order(db, order_id)


def list_sales_orders(db: Session) -> list[SalesOrder]:
    """Retrieve orders, newest first, with items and creator loaded."""
    statement = (
        select(SalesOrder)
        .options(
            selectinload(SalesOrder.items),
            selectinload(SalesOrder.creator),
        )
        .order_by(SalesOrder.id.desc())
    )

    return list(db.execute(statement).scalars().unique().all())
