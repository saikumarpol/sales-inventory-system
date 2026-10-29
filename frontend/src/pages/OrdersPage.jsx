import { useState } from "react";
import { Plus } from "lucide-react";

import { ordersApi } from "@/lib/api";
import Notice from "@/components/common/Notice";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value || 0));

export default function OrdersPage({ orders, customers, products, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([{ product_id: "", quantity: 1 }]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const total = items.reduce((sum, item) => {
    const product = products.find(
      (p) => String(p.id) === String(item.product_id)
    );
    return sum + Number(product?.price || 0) * Number(item.quantity || 0);
  }, 0);

  function updateItem(index, field, value) {
    setItems((old) =>
      old.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const orderItems = items.map((item) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
    }));

    if (!customerId) {
      setError("Select a customer.");
      return;
    }

    if (orderItems.some((item) => !item.product_id || item.quantity < 1)) {
      setError("Select a product and enter a valid quantity for each row.");
      return;
    }

    if (new Set(orderItems.map((item) => item.product_id)).size !== orderItems.length) {
      setError("Each product can appear only once in an order.");
      return;
    }

    setBusy(true);

    try {
      const result = await ordersApi.create({
        customer_id: Number(customerId),
        items: orderItems,
      });

      setSuccess(
        `Order #${result.id} created. Status: ${result.status}.`
      );
      setShowForm(false);
      setCustomerId("");
      setItems([{ product_id: "", quantity: 1 }]);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Notice error={error} success={success} />

      <div className="flex justify-end">
        <Button onClick={() => setShowForm((value) => !value)}>
          <Plus size={16} className="mr-2" />
          {showForm ? "Close form" : "Create order"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create sales order</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <label className="block space-y-1.5 text-sm">
                Customer
                <select
                  className="h-10 w-full rounded-md border bg-background px-3"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} — {customer.email}
                    </option>
                  ))}
                </select>
              </label>

              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid items-end gap-3 sm:grid-cols-[1fr_140px_auto]"
                >
                  <label className="space-y-1.5 text-sm">
                    Product
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3"
                      value={item.product_id}
                      onChange={(e) =>
                        updateItem(index, "product_id", e.target.value)
                      }
                      required
                    >
                      <option value="">Select a product</option>
                      {products
                        .filter((p) => p.is_active !== false)
                        .map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} — {money(product.price)} (stock:{" "}
                            {product.stock_quantity})
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 text-sm">
                    Quantity
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                      required
                    />
                  </label>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems((old) => old.filter((_, i) => i !== index))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setItems((old) => [
                    ...old,
                    { product_id: "", quantity: 1 },
                  ])
                }
              >
                <Plus size={16} className="mr-2" /> Add product
              </Button>

              <div className="rounded-lg bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Estimated total</p>
                <p className="text-2xl font-semibold">{money(total)}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Final pricing, availability and approval are validated by the server.
                </p>
              </div>

              <Button type="submit" disabled={busy}>
                {busy ? "Submitting..." : "Submit order"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sales orders ({orders.length})</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-zinc-500">
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer ID</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...orders].sort((a, b) => b.id - a.id).map((order) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">#{order.id}</td>
                    <td className="p-3">{order.customer_id}</td>
                    <td className="p-3">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3">{money(order.total_amount)}</td>
                    <td className="p-3">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}

                {orders.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-zinc-500">
                      No orders created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}