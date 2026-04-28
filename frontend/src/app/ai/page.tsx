"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { aiChat, generateListing, draftCommunication, getConversations, deleteConversation } from "@/lib/api";
import type { ChatMessage, Conversation } from "@/lib/types";

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="font-display text-lg mt-1 mb-2">{children}</h3>,
          h2: ({ children }) => <h4 className="font-semibold text-[15px] mt-3 mb-1.5">{children}</h4>,
          h3: ({ children }) => <h5 className="font-semibold text-sm mt-2 mb-1">{children}</h5>,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-2">{children}</ol>,
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
          em: ({ children }) => <em className="italic text-text-soft">{children}</em>,
          a: ({ href, children }) => <a href={href} className="link" target="_blank" rel="noopener noreferrer">{children}</a>,
          code: ({ children }) => <code className="font-mono text-[12px] bg-bg-elevated/60 border border-border-soft rounded px-1 py-0.5">{children}</code>,
          pre: ({ children }) => <pre className="font-mono text-[12px] bg-bg border border-border-soft rounded-lg p-3 overflow-x-auto my-2">{children}</pre>,
          hr: () => <hr className="my-3 border-border-soft" />,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-accent/60 pl-3 text-text-soft italic my-2">{children}</blockquote>,
          table: ({ children }) => <div className="overflow-x-auto my-2"><table className="text-xs border-collapse">{children}</table></div>,
          th: ({ children }) => <th className="border border-border-soft px-2 py-1 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-border-soft px-2 py-1">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

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
      <div className="w-72 panel rounded-xl p-4 flex flex-col gap-2">
        <h2 className="font-display text-base text-text mb-2">Quick Actions</h2>
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => setActiveAction(action.id)}
            className={`text-left p-3 rounded-lg transition-colors border ${
              activeAction === action.id
                ? "border-accent/50 bg-accent/10"
                : "border-transparent hover:border-border hover:bg-bg-elevated/40"
            }`}
          >
            <div className="font-medium text-sm text-text">{action.label}</div>
            <div className="text-xs text-text-soft mt-0.5">{action.desc}</div>
          </button>
        ))}

        {/* Listing Form */}
        {activeAction === "listing" && (
          <form onSubmit={handleGenerateListing} className="mt-4 space-y-2 text-sm">
            <input placeholder="Street Address" value={listingForm.street_address} onChange={(e) => setListingForm({ ...listingForm, street_address: e.target.value })} className="field w-full text-sm" required />
            <input placeholder="City" value={listingForm.city} onChange={(e) => setListingForm({ ...listingForm, city: e.target.value })} className="field w-full text-sm" required />
            <div className="grid grid-cols-3 gap-2">
              <input placeholder={listingForm.state === "LA" ? "Parish" : "County"} value={listingForm.parish} onChange={(e) => setListingForm({ ...listingForm, parish: e.target.value })} className="field text-sm col-span-2" required />
              <select value={listingForm.state} onChange={(e) => setListingForm({ ...listingForm, state: e.target.value })} className="field text-sm">
                <option value="LA">LA</option>
                <option value="AR">AR</option>
                <option value="MS">MS</option>
              </select>
            </div>
            <select value={listingForm.property_type} onChange={(e) => setListingForm({ ...listingForm, property_type: e.target.value })} className="field w-full text-sm">
              <option value="single_family">Single Family</option>
              <option value="multi_family">Multi Family</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
              <option value="land">Land</option>
              <option value="commercial">Commercial</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Beds" type="number" value={listingForm.bedrooms} onChange={(e) => setListingForm({ ...listingForm, bedrooms: e.target.value })} className="field text-sm" />
              <input placeholder="Baths" type="number" step="0.5" value={listingForm.bathrooms} onChange={(e) => setListingForm({ ...listingForm, bathrooms: e.target.value })} className="field text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Sq Ft" type="number" value={listingForm.sqft} onChange={(e) => setListingForm({ ...listingForm, sqft: e.target.value })} className="field text-sm" />
              <input placeholder="Year Built" type="number" value={listingForm.year_built} onChange={(e) => setListingForm({ ...listingForm, year_built: e.target.value })} className="field text-sm" />
            </div>
            <input placeholder="Asking Price" type="number" value={listingForm.asking_price} onChange={(e) => setListingForm({ ...listingForm, asking_price: e.target.value })} className="field w-full text-sm" />
            <textarea placeholder="Notable features, notes..." value={listingForm.notes} onChange={(e) => setListingForm({ ...listingForm, notes: e.target.value })} className="field w-full text-sm" rows={2} />
            <select value={listingForm.tone} onChange={(e) => setListingForm({ ...listingForm, tone: e.target.value })} className="field w-full text-sm">
              <option value="professional">Professional</option>
              <option value="luxury">Luxury</option>
              <option value="casual">Casual</option>
              <option value="investor">Investor</option>
            </select>
            <button type="submit" disabled={loading} className="btn-primary w-full rounded-lg py-2">
              {loading ? "Generating..." : "Generate Listing"}
            </button>
          </form>
        )}

        {/* Conversation History */}
        {activeAction === "chat" && conversations.length > 0 && (
          <div className="mt-4 border-t border-border-soft pt-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-semibold text-text-faded uppercase tracking-wide">History</h3>
              <button onClick={startNewChat} className="text-xs text-accent hover:text-accent-soft">+ New</button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {conversations.map((c) => (
                <div key={c.id} className={`flex items-center gap-1 group rounded ${conversationId === c.id ? "bg-accent/10" : ""}`}>
                  <button
                    onClick={() => loadConversation(c)}
                    className="flex-1 text-left text-xs text-text px-2 py-1.5 rounded hover:bg-bg-elevated/50 truncate"
                  >
                    {c.title || "Untitled"}
                  </button>
                  <button
                    onClick={() => handleDeleteConversation(c.id)}
                    className="text-text-faded hover:text-red-400 px-1 opacity-0 group-hover:opacity-100 text-xs"
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
            <input placeholder="Recipient Name" value={commForm.recipient_name} onChange={(e) => setCommForm({ ...commForm, recipient_name: e.target.value })} className="field w-full text-sm" required />
            <select value={commForm.purpose} onChange={(e) => setCommForm({ ...commForm, purpose: e.target.value })} className="field w-full text-sm">
              <option value="initial_outreach">Initial Outreach</option>
              <option value="follow_up">Follow Up</option>
              <option value="price_reduction">Price Reduction</option>
              <option value="offer_received">Offer Received</option>
              <option value="closing_update">Closing Update</option>
            </select>
            <select value={commForm.medium} onChange={(e) => setCommForm({ ...commForm, medium: e.target.value })} className="field w-full text-sm">
              <option value="email">Email</option>
              <option value="text">Text Message</option>
            </select>
            <select value={commForm.tone} onChange={(e) => setCommForm({ ...commForm, tone: e.target.value })} className="field w-full text-sm">
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="urgent">Urgent</option>
            </select>
            <textarea placeholder="Additional context..." value={commForm.context} onChange={(e) => setCommForm({ ...commForm, context: e.target.value })} className="field w-full text-sm" rows={2} />
            <button type="submit" disabled={loading} className="btn-primary w-full rounded-lg py-2">
              {loading ? "Drafting..." : "Draft Message"}
            </button>
          </form>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 panel rounded-xl flex flex-col">
        <div className="p-4 border-b border-border-soft">
          <h1 className="font-display text-xl text-text">AI Assistant</h1>
          <p className="text-sm text-text-soft">Your LA, AR, and MS real estate AI — powered by Claude</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-text-faded mt-20">
              <p className="text-4xl mb-4">🏠</p>
              <p className="font-display text-lg text-text">NewGen Realty AI</p>
              <p className="text-sm mt-2">Ask me anything about real estate in Louisiana, Arkansas, or Mississippi.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-accent-deep text-white"
                  : "bg-bg-elevated border border-border text-text"
              }`}>
                {msg.role === "user"
                  ? <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  : <AssistantMarkdown content={msg.content} />}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-bg-elevated border border-border rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-text-faded rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-text-faded rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-text-faded rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {activeAction === "chat" && (
          <form onSubmit={handleChat} className="p-4 border-t border-border-soft flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about LA, AR, or MS real estate..."
              className="field flex-1 text-sm"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-6 py-2 rounded-lg">
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
