"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProperties, deleteProperty } from "@/lib/api";
import type { Property } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";
import FilterBar, { type FilterConfig } from "@/components/ui/FilterBar";

const propertyFilters: FilterConfig[] = [
  { key: "q", label: "Search", type: "text", placeholder: "Address, city, parish..." },
  {
    key: "status", label: "Status", type: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "active", label: "Active" },
      { value: "pending", label: "Pending" },
      { value: "sold", label: "Sold" },
      { value: "withdrawn", label: "Withdrawn" },
    ],
  },
  {
    key: "property_type", label: "Type", type: "select",
    options: [
      { value: "single_family", label: "Single Family" },
      { value: "multi_family", label: "Multi Family" },
      { value: "condo", label: "Condo" },
      { value: "townhouse", label: "Townhouse" },
      { value: "land", label: "Land" },
      { value: "commercial", label: "Commercial" },
    ],
  },
  { key: "parish", label: "Parish", type: "text", placeholder: "e.g. Jefferson" },
  { key: "bedrooms", label: "Min Beds", type: "text", placeholder: "e.g. 3" },
];

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProperties();
  }, [filters]);

  async function loadProperties() {
    try {
      const res = await getProperties(filters);
      setProperties(res.data);
    } catch {
      // API not running
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this property?")) return;
    await deleteProperty(id);
    loadProperties();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
        <Link href="/properties/new" className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
          + Add Property
        </Link>
      </div>

      <FilterBar filters={propertyFilters} onFilter={setFilters} />

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg">No properties found</p>
          <p className="text-sm mt-2">Add your first property or adjust filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((prop) => (
            <Link key={prop.id} href={`/properties/${prop.id}`} className="block">
              <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow border border-transparent hover:border-emerald-200">
                <div className="flex justify-between items-start mb-3">
                  <StatusBadge value={prop.status} />
                  <button
                    onClick={(e) => handleDelete(e, prop.id)}
                    className="text-gray-400 hover:text-red-500 text-sm"
                  >
                    Delete
                  </button>
                </div>
                <h3 className="font-semibold text-gray-900">{prop.street_address}</h3>
                <p className="text-sm text-gray-500">{prop.city}, {prop.parish} Parish, LA {prop.zip_code}</p>
                <div className="mt-3 flex gap-4 text-sm text-gray-600">
                  {prop.bedrooms && <span>{prop.bedrooms} bd</span>}
                  {prop.bathrooms && <span>{prop.bathrooms} ba</span>}
                  {prop.sqft && <span>{prop.sqft.toLocaleString()} sqft</span>}
                </div>
                {prop.asking_price && (
                  <p className="mt-2 text-lg font-bold text-emerald-600">${prop.asking_price.toLocaleString()}</p>
                )}
                {prop.ai_description && (
                  <p className="mt-2 text-xs text-gray-400">AI description generated</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
