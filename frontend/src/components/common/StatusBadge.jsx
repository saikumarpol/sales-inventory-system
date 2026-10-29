const labels = {
  PENDING_APPROVAL: "Pending approval",
  CONFIRMED: "Confirmed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export default function StatusBadge({ status }) {
  const styles = {
    PENDING_APPROVAL: "bg-amber-50 text-amber-800 border-amber-200",
    CONFIRMED: "bg-blue-50 text-blue-800 border-blue-200",
    APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
    REJECTED: "bg-red-50 text-red-800 border-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[status] || "bg-zinc-50 text-zinc-700 border-zinc-200"
      }`}
    >
      {labels[status] || status || "Unknown"}
    </span>
  );
}