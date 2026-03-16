interface Props {
  score: number | null;
  size?: "sm" | "md";
}

export default function LeadScoreBadge({ score, size = "md" }: Props) {
  if (score === null || score === undefined) {
    return (
      <span className={`inline-flex items-center ${size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"} rounded-full bg-gray-100 text-gray-400`}>
        No score
      </span>
    );
  }

  let color: string;
  let label: string;
  if (score >= 80) {
    color = "bg-red-100 text-red-700";
    label = "Hot";
  } else if (score >= 60) {
    color = "bg-orange-100 text-orange-700";
    label = "Warm";
  } else if (score >= 40) {
    color = "bg-yellow-100 text-yellow-700";
    label = "Moderate";
  } else if (score >= 20) {
    color = "bg-blue-100 text-blue-700";
    label = "Cool";
  } else {
    color = "bg-gray-100 text-gray-600";
    label = "Cold";
  }

  return (
    <span className={`inline-flex items-center gap-1 ${size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"} rounded-full font-medium ${color}`}>
      <span className="font-bold">{Math.round(score)}</span>
      <span className="opacity-75">{label}</span>
    </span>
  );
}
