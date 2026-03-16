"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProperties, deleteProperty } from "@/lib/api";
import type { Property } from "@/lib/types";

const statusColors: Record<string, string> = {
  draft: "bg-gray-200 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  sold: "bg-blue-100 text-blue-700",
  withdrawn: "bg-red-100 text-red-700",
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    loadProperties();
  }, []);

  async function loadProperties() {
    try {
      const res = await getProperties();
      setProperties(res.data);
    } catch {
      // API not running
    }
  }

  async function handleDelete(id: string) {
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

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg">No properties yet</p>
          <p className="text-sm mt-2">Add your first property to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((prop) => (
            <div key={prop.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex justify-between items-start mb-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[prop.status] || ""}`}>
                  {prop.status}
                </span>
                <button onClick={() => handleDelete(prop.id)} className="text-gray-400 hover:text-red-500 text-sm">
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
          ))}
        </div>
      )}
    </div>
  );
}
