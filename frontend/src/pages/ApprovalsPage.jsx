import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { ordersApi } from "@/lib/api";
import Notice from "@/components/common/Notice";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
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

export default function ApprovalsPage({ orders, reload, user }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pending = orders.filter(
    (order) => order.status === "PENDING_APPROVAL"
  );

  const isManager = user?.role === "manager";

  async function decide(order, action) {
    if (!isManager) {
      setError("Only managers can approve or reject orders.");
      return;
    }

    const verb = action === "approve" ? "Approve" : "Reject";
    if (!window.confirm(`${verb} order #${order.id}?`)) return;

    setBusyId(order.id);
    setError("");
    setSuccess("");

    try {
      if (action === "approve") {
        await ordersApi.approve(order.id);
      } else {
        await ordersApi.reject(order.id);
      }

      setSuccess(`Order #${order.id} ${action}d successfully.`);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <Notice error={error} success={success} />

      {!isManager && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          You are signed in as a sales user. Only managers can make approval decisions.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending approvals ({pending.length})</CardTitle>
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
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((order) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">#{order.id}</td>
                    <td className="p-3">{order.customer_id}</td>
                    <td className="p-3">{money(order.total_amount)}</td>
                    <td className="p-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={!isManager || busyId !== null}
                          onClick={() => decide(order, "approve")}
                        >
                          <CheckCircle2 size={15} className="mr-1" />
                          Approve
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isManager || busyId !== null}
                          onClick={() => decide(order, "reject")}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {pending.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-zinc-500">
                      No orders are awaiting approval.
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