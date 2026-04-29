"use client";

import { useEffect, useState } from "react";
import {
  fetchTeam,
  inviteTeamMember,
  removeTeamMember,
  cancelInvite,
} from "@/lib/business-team";

export default function TeamPage() {
  const [data, setData] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetchTeam();
    setData(res);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite() {
    if (!email) return;
    setLoading(true);
    try {
      await inviteTeamMember(email);
      setEmail("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: number) {
    await removeTeamMember(id);
    await load();
  }

  async function handleCancelInvite(id: number) {
    await cancelInvite(id);
    await load();
  }

  if (!data) {
    return <div className="p-6">Loading team...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Team</h1>

      {/* Seats */}
      <div className="mb-6 p-4 border rounded-lg">
        <p className="text-sm text-gray-500">Seats</p>
        <p className="text-lg font-medium">
          {data.seat_usage.active_recruiter_seats} /{" "}
          {data.seat_usage.total_available_seats}
        </p>
        <p className="text-sm text-gray-400">
          {data.seat_usage.available_seats} available
        </p>
      </div>

      {/* Invite */}
      {data.is_owner && (
        <div className="mb-8 flex gap-2">
          <input
            type="email"
            placeholder="Invite recruiter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          />
          <button
            onClick={handleInvite}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Invite
          </button>
        </div>
      )}

      {/* Members */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Members</h2>

        <div className="space-y-3">
          {data.members.map((m: any) => (
            <div
              key={m.id}
              className="flex justify-between items-center border p-3 rounded"
            >
              <div>
                <p className="font-medium">
                  {m.user?.full_name || m.user?.email}
                </p>
                <p className="text-sm text-gray-500">{m.role}</p>
              </div>

              {data.is_owner && (
                <button
                  onClick={() => handleRemove(m.id)}
                  className="text-red-500 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invites */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Pending Invites</h2>

        <div className="space-y-3">
          {data.invites.map((i: any) => (
            <div
              key={i.id}
              className="flex justify-between items-center border p-3 rounded"
            >
              <div>
                <p>{i.email}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>

              {data.is_owner && (
                <button
                  onClick={() => handleCancelInvite(i.id)}
                  className="text-red-500 text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}