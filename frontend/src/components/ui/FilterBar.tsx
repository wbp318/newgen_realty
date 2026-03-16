"use client";

import { useState } from "react";

export interface FilterConfig {
  key: string;
  label: string;
  type: "text" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface Props {
  filters: FilterConfig[];
  onFilter: (values: Record<string, string>) => void;
}

export default function FilterBar({ filters, onFilter }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);

  function handleChange(key: string, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    // Remove empty values
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(next)) {
      if (v) cleaned[k] = v;
    }
    onFilter(cleaned);
  }

  function handleClear() {
    setValues({});
    onFilter({});
  }

  const hasFilters = Object.values(values).some(Boolean);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <span>{expanded ? "▼" : "▶"}</span> Filters
          {hasFilters && (
            <span className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full ml-1">
              Active
            </span>
          )}
        </button>
        {hasFilters && (
          <button onClick={handleClear} className="text-xs text-gray-400 hover:text-gray-600">
            Clear all
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-3 flex flex-wrap gap-3">
          {filters.map((f) => (
            <div key={f.key} className="flex-1 min-w-[150px] max-w-[250px]">
              <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
              {f.type === "select" ? (
                <select
                  value={values[f.key] || ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="w-full border rounded-lg px-3 py-1.5 text-sm text-gray-900"
                >
                  <option value="">All</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={f.placeholder || f.label}
                  value={values[f.key] || ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className="w-full border rounded-lg px-3 py-1.5 text-sm text-gray-900"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
