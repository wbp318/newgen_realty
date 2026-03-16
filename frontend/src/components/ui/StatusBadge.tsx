const statusColors: Record<string, string> = {
  draft: "bg-gray-200 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  sold: "bg-blue-100 text-blue-700",
  withdrawn: "bg-red-100 text-red-700",
};

const typeColors: Record<string, string> = {
  buyer: "bg-blue-100 text-blue-700",
  seller: "bg-emerald-100 text-emerald-700",
  both: "bg-purple-100 text-purple-700",
  lead: "bg-amber-100 text-amber-700",
};

interface Props {
  value: string;
  variant?: "status" | "type";
}

export default function StatusBadge({ value, variant = "status" }: Props) {
  const colors = variant === "status" ? statusColors : typeColors;
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors[value] || "bg-gray-100 text-gray-600"}`}>
      {value}
    </span>
  );
}
