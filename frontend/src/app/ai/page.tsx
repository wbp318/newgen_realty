"use client";

import { useState, useRef, useEffect } from "react";
import { aiChat, generateListing, draftCommunication, getConversations, deleteConversation } from "@/lib/api";
import type { ChatMessage, Conversation } from "@/lib/types";

const quickActions = [
  { id: "chat", label: "General Chat", desc: "Ask anything about LA, AR, or MS real estate" },
  { id: "listing", label: "Generate Listing", desc: "Create a property description" },
  { id: "comm", label: "Draft Message", desc: "Write an email or text" },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState("chat");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listing form state
  const [listingForm, setListingForm] = useState({
    street_address: "",
    city: "",
    parish: "",
    state: "LA",
    property_type: "single_family",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
    asking_price: "",
    year_built: "",
    notes: "",
    tone: "professional",
  });

  // Comm form state
  const [commForm, setCommForm] = useState({
    recipient_name: "",
    purpose: "initial_outreach",
    context: "",
    tone: "professional",
    medium: "email",
  });

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    try {
      const res = await getConversations();
      setConversations(res.data);
    } catch {
      // ignore
    }
  }

  function loadConversation(convo: Conversation) {
    setConversationId(convo.id);
    setMessages(convo.messages || []);
    setActiveAction("chat");
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([]);
  }

  async function handleDeleteConversation(id: string) {
    await deleteConversation(id);
    if (conversationId === id) startNewChat();
    loadConversations();
  }

  async function handleChat(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await aiChat(newMessages, conversationId);
      setMessages([...newMessages, { role: "assistant", content: res.data.response }]);
      setConversationId(res.data.conversation_id);
      loadConversations();
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Error: Could not reach the AI service. Make sure the backend is running." }]);
    }
    setLoading(false);
  }

  async function handleGenerateListing(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const parishLabel = listingForm.state === "LA" ? "Parish" : "County";
    const userMsg: ChatMessage = {
      role: "user",
      content: `Generate listing for: ${listingForm.street_address}, ${listingForm.city}, ${listingForm.parish} ${parishLabel} (${listingForm.state})`,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await generateListing({
        ...listingForm,
        bedrooms: listingForm.bedrooms ? parseInt(listingForm.bedrooms) : null,
        bathrooms: listingForm.bathrooms ? parseFloat(listingForm.bathrooms) : null,
        sqft: listingForm.sqft ? parseInt(listingForm.sqft) : null,
        asking_price: listingForm.asking_price ? parseInt(listingForm.asking_price) : null,
        year_built: listingForm.year_built ? parseInt(listingForm.year_built) : null,
      });
      const content = `**${res.data.headline}**\n\n${res.data.description}`;
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error generating listing. Check that the backend is running." }]);
    }
    setLoading(false);
  }

  async function handleDraftComm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const userMsg: ChatMessage = {
      role: "user",
      content: `Draft ${commForm.medium} to ${commForm.recipient_name} — ${commForm.purpose.replace("_", " ")}`,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await draftCommunication(commForm);
      let content = "";
      if (res.data.subject) content += `**Subject:** ${res.data.subject}\n\n`;
      content += res.data.body;
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error drafting communication." }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      {/* Sidebar - Quick Actions */}
      <div className="w-72 bg-white rounded-xl shadow-sm p-4 flex flex-col gap-2">
        <h2 className="font-semibold text-gray-900 mb-2">Quick Actions</h2>
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => setActiveAction(action.id)}
            className={`text-left p-3 rounded-lg transition-colors ${
              activeAction === action.id
                ? "bg-emerald-50 border-2 border-emerald-300"
                : "border-2 border-transparent hover:bg-gray-50"
            }`}
          >
            <div className="font-medium text-sm text-gray-900">{action.label}</div>
            <div className="text-xs text-gray-500">{action.desc}</div>
          </button>
        ))}

        {/* Listing Form */}
        {activeAction === "listing" && (
          <form onSubmit={handleGenerateListing} className="mt-4 space-y-2 text-sm">
            <input placeholder="Street Address" value={listingForm.street_address} onChange={(e) => setListingForm({ ...listingForm, street_address: e.target.value })} className="w-full border rounded px-2 py-1 text-gray-900" required />
            <input placeholder="City" value={listingForm.city} onChange={(e) => setListingForm({ ...listingForm, city: e.target.value })} className="w-full border rounded px-2 py-1 text-gray-900" required />
            <div className="grid grid-cols-3 gap-2">
              <input placeholder={listingForm.state === "LA" ? "Parish" : "County"} value={listingForm.parish} onChange={(e) => setListingForm({ ...listingForm, parish: e.target.value })} className="col-span-2 border rounded px-2 py-1 text-gray-900" required />
              <select value={listingForm.state} onChange={(e) => setListingForm({ ...listingForm, state: e.target.value })} className="border rounded px-2 py-1 text-gray-900">
                <option value="LA">LA</option>
                <option value="AR">AR</option>
                <option value="MS">MS</option>
              </select>
            </div>
            <select value={listingForm.property_type} onChange={(e) => setListingForm({ ...listingForm, property_type: e.target.value })} className="w-full border rounded px-2 py-1 text-gray-900">
              <option value="single_family">Single Family</option>
              <option value="multi_family">Multi Family</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
              <option value="land">Land</option>
              <option value="commercial">Commercial</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Beds" type="number" value={listingForm.bedrooms} onChange={(e) => setListingForm({ ...listingForm, bedrooms: e.target.value })} className="border rounded px-2 py-1 text-gray-900" />
              <input placeholder="Baths" type="number" step="0.5" value={listingForm.bathrooms} onChange={(e) => setListingForm({ ...listingForm, bathrooms: e.target.value })} className="border rounded px-2 py-1 text-gray-900" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Sq Ft" type="number" value={listingForm.sqft} onChange={(e) => setListingForm({ ...listingForm, sqft: e.target.value })} className="border rounded px-2 py-1 text-gray-900" />
              <input placeholder="Year Built" type="number" value={listingForm.year_built} onChange={(e) => setListingForm({ ...listingForm, year_built: e.target.value })} className="border rounded px-2 py-1 text-gray-900" />
            </div>
            <input placeholder="Asking Price" type="number" value={listingForm.asking_price} onChange={(e) => setListingForm({ ...listingForm, asking_price: e.target.value })} className="w-full border rounded px-2 py-1 text-gray-900" />
            <textarea placeholder="Notable features, notes..." value={listingForm.notes} onChange={(e) => setListingForm({ ...listingForm, notes: e.target.value })} className="w-full border rounded px-2 py-1 text-gray-900" rows={2} />
            <select value={listingForm.tone} onChange={(e) => setListingForm({ ...listingForm, tone: e.target.value })} className="w-full border rounded px-2 py-1 text-gray-900">
              <option value="professional">Professional</option>
              <option value="luxury">Luxury</option>
              <option value="casual">Casual</option>
              <option value="investor">Investor</option>
            </select>
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white rounded py-2 hover:bg-emerald-700 disabled:opacity-50">
              {loading ? "Generating..." : "Generate Listing"}
            </button>
          </form>
        )}

        {/* Conversation History */}
        {activeAction === "chat" && conversations.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">History</h3>
              <button onClick={startNewChat} className="text-xs text-emerald-600 hover:text-emerald-700">+ New</button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {conversations.map((c) => (
                <div key={c.id} className={`flex items-center gap-1 group ${conversationId === c.id ? "bg-emerald-50" : ""} rounded`}>
                  <button
                    onClick={() => loadConversation(c)}
                    className="flex-1 text-left text-xs text-gray-700 px-2 py-1.5 rounded hover:bg-gray-50 truncate"
                  >
                    {c.title || "Untitled"}
                  </button>
                  <button
                    onClick={() => handleDeleteConversation(c.id)}
                    className="text-gray-400 hover:text-red-500 px-1 opacity-0 group-hover:opacity-100 text-xs"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Communication Form */}
        {activeAction === "comm" && (
          <form onSubmit={handleDraftComm} className="mt-4 space-y-2 text-sm">
            <input placeholder="Recipient Name" value={commForm.recipient_name} onChange={(e) => setCommForm({ ...commForm, recipient_name: e.target.value })} className="w-full border rounded px-2 py-1 text-gray-900" required />
            <select value={commForm.purpose} onChange={(e) => setCommForm({ ...commForm, purpose: e.target.value })} className="w-full border rounded px-2 py-1 text-gray-900">
              <option value="initial_outreach">Initial Outreach</option>
              <option value="follow_up">Follow Up</option>
              <option value="price_reduction">Price Reduction</option>
              <option value="offer_received">Offer Received</option>
              <option value="closing_update">Closing Update</option>
            </select>
            <select value={commForm.medium} onChange={(e) => setCommForm({ ...commForm, medium: e.target.value })} className="w-full border rounded px-2 py-1 text-gray-900">
              <option value="email">Email</option>
              <option value="text">Text Message</option>
            </select>
            <select value={commForm.tone} onChange={(e) => setCommForm({ ...commForm, tone: e.target.value })} className="w-full border rounded px-2 py-1 text-gray-900">
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="urgent">Urgent</option>
            </select>
            <textarea placeholder="Additional context..." value={commForm.context} onChange={(e) => setCommForm({ ...commForm, context: e.target.value })} className="w-full border rounded px-2 py-1 text-gray-900" rows={2} />
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white rounded py-2 hover:bg-emerald-700 disabled:opacity-50">
              {loading ? "Drafting..." : "Draft Message"}
            </button>
          </form>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-500">Your LA, AR, and MS real estate AI — powered by Claude</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-4xl mb-4">🏠</p>
              <p className="text-lg font-medium">NewGen Realty AI</p>
              <p className="text-sm mt-2">Ask me anything about real estate in Louisiana, Arkansas, or Mississippi.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}>
                <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content}</pre>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {activeAction === "chat" && (
          <form onSubmit={handleChat} className="p-4 border-t flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about LA, AR, or MS real estate..."
              className="flex-1 border rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
