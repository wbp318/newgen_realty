interface Props {
  score: number | null;
  size?: "sm" | "md";
}

export default function ProspectScoreBadge({ score, size = "md" }: Props) {
  if (score === null || score === undefined) {
    return (
      <span className={`inline-flex items-center ${size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"} rounded-full bg-gray-100 text-gray-400`}>
        Unscored
      </span>
    );
  }

  let color: string;
  let label: string;
  if (score >= 85) {
    color = "bg-red-100 text-red-700";
    label = "Highly Motivated";
  } else if (score >= 70) {
    color = "bg-orange-100 text-orange-700";
    label = "Strong";
  } else if (score >= 50) {
    color = "bg-yellow-100 text-yellow-700";
    label = "Moderate";
  } else if (score >= 30) {
    color = "bg-blue-100 text-blue-700";
    label = "Low";
  } else {
    color = "bg-gray-100 text-gray-600";
    label = "Unlikely";
  }

  return (
    <span className={`inline-flex items-center gap-1 ${size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"} rounded-full font-medium ${color}`}>
      <span className="font-bold">{Math.round(score)}</span>
      <span className="opacity-75">{label}</span>
    </span>
  );
}
