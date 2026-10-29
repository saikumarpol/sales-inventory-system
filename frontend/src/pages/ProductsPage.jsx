import { useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { productsApi } from "@/lib/api";
import Notice from "@/components/common/Notice";
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

const emptyProduct = {
  name: "",
  sku: "",
  description: "",
  price: "",
  stock_quantity: 0,
};

export default function ProductsPage({ products, reload }) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = products.filter((p) =>
    `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase())
  );

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      sku: product.sku || "",
      description: product.description || "",
      price: product.price ?? "",
      stock_quantity: product.stock_quantity ?? 0,
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyProduct);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity),
      };

      if (editingId !== null) {
        await productsApi.update(editingId, payload);
        setSuccess("Product updated.");
      } else {
        await productsApi.create(payload);
        setSuccess("Product created.");
      }

      cancelForm();
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(product) {
    if (!window.confirm(`Delete ${product.name}?`)) return;

    setError("");
    setSuccess("");

    try {
      await productsApi.remove(product.id);
      setSuccess("Product deleted.");
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
            <CardTitle>{editingId ? "Edit product" : "Add product"}</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                Product name
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>

              <label className="space-y-1 text-sm">
                SKU
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  required
                />
              </label>

              <label className="space-y-1 text-sm">
                Price
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </label>

              <label className="space-y-1 text-sm">
                Stock quantity
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock_quantity}
                  onChange={(e) =>
                    setForm({ ...form, stock_quantity: e.target.value })
                  }
                  required
                />
              </label>

              <label className="space-y-1 text-sm sm:col-span-2">
                Description
                <textarea
                  className="min-h-20 w-full rounded-md border bg-background px-3 py-2"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving..." : "Save product"}
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
          <CardTitle>Products ({products.length})</CardTitle>
          <Button onClick={() => { cancelForm(); setShowForm(true); }}>
            <Plus size={16} className="mr-2" /> Add product
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
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-zinc-500">
                  <th className="p-3">Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{product.name}</td>
                    <td className="p-3">{product.sku}</td>
                    <td className="p-3">{money(product.price)}</td>
                    <td className="p-3">{product.stock_quantity}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit product"
                          onClick={() => startEdit(product)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete product"
                          onClick={() => remove(product)}
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
                      No products found.
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