
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import PageHeader from "@/components/common/PageHeader";
import Notice from "@/components/common/Notice";
import Sidebar from "@/layout/Sidebar";

import Dashboard from "@/pages/Dashboard";
import ProductsPage from "@/pages/ProductsPage";
import CustomersPage from "@/pages/CustomersPage";
import OrdersPage from "@/pages/OrdersPage";
import ApprovalsPage from "@/pages/ApprovalsPage";

import {
  productsApi,
  customersApi,
  ordersApi,
} from "@/lib/api";

const pageInfo = {
  Dashboard: ["Dashboard", "Here's what's happening with your business."],
  Products: ["Products & inventory", "Manage your products, prices and stock."],
  Customers: ["Customers", "Manage your customer directory."],
  Orders: ["Sales orders", "Create orders and track their progress."],
  Approvals: ["Order approvals", "Review orders awaiting manager approval."],
};

export default function App({ user }) {
  const [activePage, setActivePage] = useState("Dashboard");

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (initial = false) => {
    setError("");

    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [productData, customerData, orderData] = await Promise.all([
        productsApi.list(),
        customersApi.list(),
        ordersApi.list(),
      ]);

      setProducts(Array.isArray(productData) ? productData : []);
      setCustomers(Array.isArray(customerData) ? customerData : []);
      setOrders(Array.isArray(orderData) ? orderData : []);
    } catch (err) {
      setError(err.message || "Unable to load application data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const [title, description] =
    pageInfo[activePage] || pageInfo.Dashboard;

  function renderPage() {
    switch (activePage) {
      case "Products":
        return (
          <ProductsPage
            products={products}
            reload={() => loadData(false)}
          />
        );

      case "Customers":
        return (
          <CustomersPage
            customers={customers}
            reload={() => loadData(false)}
          />
        );

      case "Orders":
        return (
          <OrdersPage
            orders={orders}
            customers={customers}
            products={products}
            reload={() => loadData(false)}
          />
        );

      case "Approvals":
        return (
          <ApprovalsPage
            orders={orders}
            reload={() => loadData(false)}
            user={user}
          />
        );

      default:
        return (
          <Dashboard
            products={products}
            customers={customers}
            orders={orders}
            setActivePage={setActivePage}
          />
        );
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-950">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
      />

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b bg-white/95 px-4 backdrop-blur sm:px-7">
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-zinc-500">Stockwise workspace</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Navigate to page"
              className="h-9 rounded-md border bg-white px-2 text-sm lg:hidden"
              value={activePage}
              onChange={(event) => setActivePage(event.target.value)}
            >
              {Object.keys(pageInfo).map((page) => (
                <option key={page} value={page}>
                  {page}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              disabled={refreshing}
            >
              <RefreshCw
                size={15}
                className={`mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-7">
          <PageHeader title={title} description={description} />

          <Notice error={error} />

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <LoaderCircle
                size={28}
                className="animate-spin text-zinc-500"
              />
              <span className="ml-3 text-sm text-zinc-500">
                Loading application data...
              </span>
            </div>
          ) : (
            renderPage()
          )}

          <footer className="flex flex-col gap-2 border-t pt-5 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
            <span>Stockwise · Sales & Inventory Management</span>
            <span>Connected application</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
