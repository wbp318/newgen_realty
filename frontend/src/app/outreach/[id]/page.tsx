"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getOutreachCampaign,
  updateOutreachCampaign,
  getCampaignMessages,
  getCampaignInsights,
  activateCampaign,
  pauseCampaign,
  sendMessageNow,
} from "@/lib/api";
import type {
  OutreachCampaign,
  OutreachMessage,
  CampaignInsights,
  SequenceStep,
} from "@/lib/types";

const DEFAULT_SEQUENCE: SequenceStep[] = [
  { step: 1, day_offset: 0, medium: "email", tone_override: null },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<OutreachCampaign | null>(null);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [insights, setInsights] = useState<CampaignInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [sequence, setSequence] = useState<SequenceStep[]>(DEFAULT_SEQUENCE);
  const [savingSeq, setSavingSeq] = useState(false);
  const [sendWindowStart, setSendWindowStart] = useState<number>(9);
  const [sendWindowEnd, setSendWindowEnd] = useState<number>(18);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadCampaign();
    loadMessages();
  }, [id]);

  async function loadCampaign() {
    try {
      const res = await getOutreachCampaign(id);
      const c: OutreachCampaign = res.data;
      setCampaign(c);
      setSequence(
        c.sequence_config && c.sequence_config.length > 0
          ? c.sequence_config
          : DEFAULT_SEQUENCE
      );
      setSendWindowStart(c.send_window_start ?? 9);
      setSendWindowEnd(c.send_window_end ?? 18);
    } catch {
      router.push("/outreach");
    }
  }

  async function loadMessages() {
    try {
      const res = await getCampaignMessages(id);
      setMessages(res.data);
    } catch {
      // ignore
    }
  }

  async function handleActivate() {
    if (!confirm(`Activate campaign? This will queue messages for ${sequence.length} step(s) per prospect.`)) return;
    setActivating(true);
    try {
      await updateOutreachCampaign(id, {
        sequence_config: sequence,
        send_window_start: sendWindowStart,
        send_window_end: sendWindowEnd,
      });
      const res = await activateCampaign(id);
      alert(
        `Activated. Queued ${res.data.queued} messages. Skipped ${res.data.skipped_existing} existing, blocked ${res.data.blocked}.`
      );
      await loadCampaign();
      await loadMessages();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Error activating campaign";
      alert(msg);
    } finally {
      setActivating(false);
    }
  }

  async function handlePause() {
    try {
      await pauseCampaign(id);
      await loadCampaign();
    } catch {
      alert("Error pausing campaign");
    }
  }

  async function handleResume() {
    try {
      await updateOutreachCampaign(id, { status: "active" });
      await loadCampaign();
    } catch {
      alert("Error resuming campaign");
    }
  }

  async function handleSendNow(messageId: string) {
    try {
      const res = await sendMessageNow(messageId);
      if (res.data.status === "sent") {
        alert("Message sent.");
      } else if (res.data.last_error) {
        alert(`Not sent: ${res.data.last_error}`);
      } else {
        alert(`Status: ${res.data.status}`);
      }
      await loadMessages();
      await loadCampaign();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Error sending message";
      alert(msg);
    }
  }

  async function handleSaveSequence() {
    setSavingSeq(true);
    try {
      await updateOutreachCampaign(id, {
        sequence_config: sequence,
        send_window_start: sendWindowStart,
        send_window_end: sendWindowEnd,
      });
      await loadCampaign();
    } catch {
      alert("Error saving sequence");
    } finally {
      setSavingSeq(false);
    }
  }

  function updateStep(index: number, patch: Partial<SequenceStep>) {
    setSequence((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  function addStep() {
    const nextStep = sequence.length + 1;
    const lastOffset = sequence.length > 0 ? sequence[sequence.length - 1].day_offset : 0;
    setSequence([
      ...sequence,
      {
        step: nextStep,
        day_offset: lastOffset + 3,
        medium: "email",
        tone_override: null,
      },
    ]);
  }

  function removeStep(index: number) {
    setSequence((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, step: i + 1 }))
    );
  }

  async function handleGetInsights() {
    setLoadingInsights(true);
    try {
      const res = await getCampaignInsights(id);
      setInsights(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error generating insights";
      alert(msg);
    } finally {
      setLoadingInsights(false);
    }
  }

  if (!campaign) {
    return <div className="text-gray-400">Loading...</div>;
  }

  const sentPct = campaign.total_messages > 0 ? ((campaign.sent_count / campaign.total_messages) * 100).toFixed(0) : 0;
  const openPct = campaign.sent_count > 0 ? ((campaign.opened_count / campaign.sent_count) * 100).toFixed(1) : 0;
  const replyPct = campaign.sent_count > 0 ? ((campaign.replied_count / campaign.sent_count) * 100).toFixed(1) : 0;

  const messageStatusColors: Record<string, string> = {
    draft: "bg-gray-200 text-gray-700",
    queued: "bg-blue-100 text-blue-700",
    sent: "bg-emerald-100 text-emerald-700",
    delivered: "bg-emerald-100 text-emerald-700",
    opened: "bg-purple-100 text-purple-700",
    replied: "bg-amber-100 text-amber-700",
    bounced: "bg-red-100 text-red-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/outreach" className="hover:text-emerald-600">Outreach</Link>
        <span>/</span>
        <span className="text-gray-900">{campaign.name}</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              campaign.status === "active" ? "bg-emerald-100 text-emerald-700" :
              campaign.status === "paused" ? "bg-amber-100 text-amber-700" :
              campaign.status === "completed" ? "bg-blue-100 text-blue-700" :
              "bg-gray-200 text-gray-700"
            }`}>
              {campaign.status}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{campaign.campaign_type || "email"}</span>
          </div>
          {campaign.description && <p className="text-sm text-gray-500 mt-1">{campaign.description}</p>}
        </div>
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <button
              onClick={handleActivate}
              disabled={activating}
              className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {activating ? "Activating..." : "Activate"}
            </button>
          )}
          {campaign.status === "active" && (
            <button onClick={handlePause} className="text-sm px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50">
              Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <button onClick={handleResume} className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
              Resume
            </button>
          )}
          <button
            onClick={handleGetInsights}
            disabled={loadingInsights}
            className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-gray-700 disabled:opacity-50"
          >
            {loadingInsights ? "Analyzing..." : "AI Insights"}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total", value: campaign.total_messages, color: "text-gray-900" },
          { label: "Sent", value: `${campaign.sent_count} (${sentPct}%)`, color: "text-blue-600" },
          { label: "Delivered", value: campaign.delivered_count, color: "text-emerald-600" },
          { label: "Opened", value: `${campaign.opened_count} (${openPct}%)`, color: "text-purple-600" },
          { label: "Replied", value: `${campaign.replied_count} (${replyPct}%)`, color: "text-amber-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-4">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Sequence Builder */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Drip Sequence</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure multi-touch steps. Messages queue at day offsets from activation and only send inside the window below (TCPA 8am-9pm still applies).
            </p>
          </div>
          <button
            onClick={handleSaveSequence}
            disabled={savingSeq || campaign.status !== "draft"}
            className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-gray-700 disabled:opacity-50"
            title={campaign.status !== "draft" ? "Lock: edits only in draft" : ""}
          >
            {savingSeq ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="flex gap-4 mb-4">
          <label className="text-xs text-gray-600">
            Send window start (local hour)
            <input
              type="number"
              min={0}
              max={23}
              value={sendWindowStart}
              onChange={(e) => setSendWindowStart(Number(e.target.value))}
              disabled={campaign.status !== "draft"}
              className="block mt-1 w-20 border rounded px-2 py-1 text-sm disabled:bg-gray-50"
            />
          </label>
          <label className="text-xs text-gray-600">
            Send window end
            <input
              type="number"
              min={1}
              max={24}
              value={sendWindowEnd}
              onChange={(e) => setSendWindowEnd(Number(e.target.value))}
              disabled={campaign.status !== "draft"}
              className="block mt-1 w-20 border rounded px-2 py-1 text-sm disabled:bg-gray-50"
            />
          </label>
        </div>

        <div className="space-y-2">
          {sequence.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-semibold">
                {step.step}
              </div>
              <label className="text-xs text-gray-600">
                Day
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={step.day_offset}
                  onChange={(e) =>
                    updateStep(i, { day_offset: Number(e.target.value) })
                  }
                  disabled={campaign.status !== "draft"}
                  className="block mt-1 w-20 border rounded px-2 py-1 text-sm disabled:bg-gray-50"
                />
              </label>
              <label className="text-xs text-gray-600">
                Medium
                <select
                  value={step.medium}
                  onChange={(e) => updateStep(i, { medium: e.target.value })}
                  disabled={campaign.status !== "draft"}
                  className="block mt-1 w-28 border rounded px-2 py-1 text-sm disabled:bg-gray-50"
                >
                  <option value="email">Email</option>
                  <option value="text">SMS</option>
                  <option value="letter">Letter</option>
                </select>
              </label>
              <label className="text-xs text-gray-600 flex-1">
                Tone override
                <input
                  type="text"
                  placeholder="default"
                  value={step.tone_override ?? ""}
                  onChange={(e) =>
                    updateStep(i, {
                      tone_override: e.target.value || null,
                    })
                  }
                  disabled={campaign.status !== "draft"}
                  className="block mt-1 w-full border rounded px-2 py-1 text-sm disabled:bg-gray-50"
                />
              </label>
              <button
                onClick={() => removeStep(i)}
                disabled={campaign.status !== "draft" || sequence.length <= 1}
                className="text-xs text-red-500 hover:text-red-700 disabled:text-gray-300 px-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {campaign.status === "draft" && (
          <button
            onClick={addStep}
            className="mt-3 text-sm px-3 py-1.5 rounded-lg border border-dashed text-gray-600 hover:bg-gray-50"
          >
            + Add step
          </button>
        )}
      </div>

      {/* AI Insights */}
      {insights && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-purple-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">AI Campaign Insights</h2>
          {insights.suggestions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h3>
              <ul className="space-y-1">
                {insights.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-2">
                    <span className="text-purple-500 flex-shrink-0">&#8226;</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insights.raw_analysis && (
            <details className="mt-3">
              <summary className="text-xs text-gray-400 cursor-pointer">Full analysis</summary>
              <pre className="mt-2 text-xs text-gray-500 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{insights.raw_analysis}</pre>
            </details>
          )}
        </div>
      )}

      {/* Messages Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Messages ({messages.length})</h2>
        </div>
        {messages.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No messages generated yet. Go to a prospect detail page and generate outreach, or use bulk generation.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prospect</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Step</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Medium</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Scheduled</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Compliance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => {
                const canSendNow = msg.status === "queued" || msg.status === "draft";
                return (
                  <Fragment key={msg.id}>
                    <tr
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedMsg(expandedMsg === msg.id ? null : msg.id)}
                    >
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        <Link
                          href={`/prospects/${msg.prospect_id}`}
                          className="hover:text-emerald-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {msg.prospect_id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-center">{msg.sequence_step ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{msg.medium}</td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{msg.subject || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            messageStatusColors[msg.status] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {msg.status}
                        </span>
                        {msg.last_error && (
                          <div className="text-xs text-red-500 mt-1 truncate max-w-[140px]" title={msg.last_error}>
                            {msg.last_error}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {msg.scheduled_send_time
                          ? new Date(msg.scheduled_send_time).toLocaleString()
                          : msg.sent_at
                          ? `sent ${new Date(msg.sent_at).toLocaleDateString()}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {msg.compliance_notes ? (
                          <span className="text-xs text-amber-600">{msg.compliance_notes}</span>
                        ) : (
                          <span className="text-xs text-emerald-600">Clear</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canSendNow ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendNow(msg.id);
                            }}
                            className="text-xs px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Send now
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                    {expandedMsg === msg.id && (
                      <tr>
                        <td colSpan={8} className="px-4 py-3 bg-gray-50">
                          <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {msg.body}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
