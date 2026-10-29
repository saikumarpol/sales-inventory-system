import {
  Boxes,
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  ClipboardList,
} from "lucide-react";

const links = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Products", icon: Package },
  { label: "Customers", icon: Users },
  { label: "Orders", icon: ShoppingCart },
  { label: "Approvals", icon: ClipboardList },
];

export default function Sidebar({ activePage, setActivePage, user }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-white lg:flex">
      <div className="flex h-20 items-center gap-3 border-b px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
          <Boxes size={21} />
        </div>

        <div>
          <p className="font-semibold">Stockwise</p>
          <p className="text-xs text-zinc-500">Business management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 pt-7">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Workspace
        </p>

        {links.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => setActivePage(label)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              activePage === label
                ? "bg-zinc-950 font-medium text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t p-4">
        <p className="truncate text-sm font-medium">{user?.name}</p>
        <p className="truncate text-xs text-zinc-500">{user?.email}</p>
        <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2 py-1 text-xs capitalize">
          {user?.role || "sales"}
        </span>
      </div>
    </aside>
  );
}