"use client";

export default function OutreachPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Outreach Campaigns</h1>
      <p className="text-gray-500 mb-8">AI-powered outreach to your prospect pipeline</p>

      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
        <p className="text-4xl mb-4">📬</p>
        <p className="text-lg">Coming in Phase 2</p>
        <p className="text-sm mt-2">
          Create campaigns, generate AI-personalized outreach, and track responses.
        </p>
        <p className="text-sm mt-1">
          First, <a href="/prospects/search" className="text-emerald-600 hover:underline">search for prospects</a> to build your pipeline.
        </p>
      </div>
    </div>
  );
}
