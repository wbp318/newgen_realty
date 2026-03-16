"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProperties, getContacts } from "@/lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState({
    properties: 0,
    activeListings: 0,
    contacts: 0,
    leads: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const [propsRes, contactsRes] = await Promise.all([
          getProperties(),
          getContacts(),
        ]);
        const props = propsRes.data;
        const contacts = contactsRes.data;
        setStats({
          properties: props.length,
          activeListings: props.filter(
            (p: { status: string }) => p.status === "active"
          ).length,
          contacts: contacts.length,
          leads: contacts.filter(
            (c: { contact_type: string }) => c.contact_type === "lead"
          ).length,
        });
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
    }
    load();
  }, []);

  const cards = [
    { label: "Total Properties", value: stats.properties, color: "bg-blue-500" },
    { label: "Active Listings", value: stats.activeListings, color: "bg-emerald-500" },
    { label: "Total Contacts", value: stats.contacts, color: "bg-purple-500" },
    { label: "Open Leads", value: stats.leads, color: "bg-amber-500" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-8">Welcome to NewGen Realty AI</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-6">
            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-white font-bold text-lg mb-3`}>
              {card.value}
            </div>
            <p className="text-gray-600 text-sm">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/ai" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-emerald-100 hover:border-emerald-300">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Assistant</h2>
          <p className="text-gray-500">Chat with your AI real estate assistant. Generate listings, analyze comps, draft communications, and get Louisiana-specific advice.</p>
        </Link>
        <Link href="/properties/new" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border-2 border-blue-100 hover:border-blue-300">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Add Property</h2>
          <p className="text-gray-500">Enter a new property listing. The AI will help generate descriptions and suggest pricing.</p>
        </Link>
      </div>
    </div>
  );
}
