import { useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { customersApi } from "@/lib/api";
import Notice from "@/components/common/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const emptyCustomer = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

export default function CustomersPage({ customers, reload }) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyCustomer);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = customers.filter((customer) =>
    `${customer.name} ${customer.email} ${customer.phone || ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  function startEdit(customer) {
    setEditingId(customer.id);
    setForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyCustomer);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      };

      if (editingId !== null) {
        await customersApi.update(editingId, payload);
        setSuccess("Customer updated.");
      } else {
        await customersApi.create(payload);
        setSuccess("Customer created.");
      }

      cancelForm();
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(customer) {
    if (!window.confirm(`Delete ${customer.name}?`)) return;

    setError("");
    setSuccess("");

    try {
      await customersApi.remove(customer.id);
      setSuccess("Customer deleted.");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <Notice error={error} success={success} />

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Edit customer" : "Add customer"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                Customer name
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>

              <label className="space-y-1 text-sm">
                Email
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </label>

              <label className="space-y-1 text-sm">
                Phone
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>

              <label className="space-y-1 text-sm">
                Address
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </label>

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving..." : "Save customer"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Customers ({customers.length})</CardTitle>
          <Button onClick={() => { cancelForm(); setShowForm(true); }}>
            <Plus size={16} className="mr-2" /> Add customer
          </Button>
        </CardHeader>

        <CardContent>
          <div className="relative mb-4 max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <Input
              className="pl-9"
              placeholder="Search customers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-zinc-500">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Address</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{customer.name}</td>
                    <td className="p-3">{customer.email}</td>
                    <td className="p-3">{customer.phone || "—"}</td>
                    <td className="p-3">{customer.address || "—"}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit customer"
                          onClick={() => startEdit(customer)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete customer"
                          onClick={() => remove(customer)}
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-zinc-500">
                      No customers found.
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