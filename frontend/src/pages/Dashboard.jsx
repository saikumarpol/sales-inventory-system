import {
  Activity,
  Package,
  ShoppingCart,
  ClipboardList,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

function Metric({ title, value, icon: Icon, description }) {
  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon size={19} className="text-zinc-500" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard({
  products,
  customers,
  orders,
  setActivePage,
}) {
  const pending = orders.filter(
    (order) => order.status === "PENDING_APPROVAL"
  ).length;

  const sales = orders
    .filter((order) => ["CONFIRMED", "APPROVED"].includes(order.status))
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  const recentOrders = [...orders]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          title="Order value"
          value={money(sales)}
          icon={Activity}
          description="Confirmed and approved orders"
        />
        <Metric
          title="Total orders"
          value={orders.length}
          icon={ShoppingCart}
          description="Orders in the database"
        />
        <Metric
          title="Products"
          value={products.filter((p) => p.is_active !== false).length}
          icon={Package}
          description="Active products"
        />
        <Metric
          title="Pending approvals"
          value={pending}
          icon={ClipboardList}
          description="Orders awaiting manager review"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => setActivePage("Products")}
          className="rounded-xl border bg-white p-5 text-left hover:bg-zinc-50"
        >
          <Package size={22} />
          <p className="mt-3 font-semibold">Products & inventory</p>
          <p className="mt-1 text-sm text-zinc-500">
            {products.length} products
          </p>
        </button>

        <button
          onClick={() => setActivePage("Customers")}
          className="rounded-xl border bg-white p-5 text-left hover:bg-zinc-50"
        >
          <Users size={22} />
          <p className="mt-3 font-semibold">Customers</p>
          <p className="mt-1 text-sm text-zinc-500">
            {customers.length} customers
          </p>
        </button>
      </div>

      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>Latest sales order activity</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setActivePage("Orders")}>
            View all
          </Button>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-zinc-500">
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer ID</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">#{order.id}</td>
                    <td className="p-3">{order.customer_id}</td>
                    <td className="p-3">{money(order.total_amount)}</td>
                    <td className="p-3">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}

                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-zinc-500">
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