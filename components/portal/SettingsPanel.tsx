"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function SettingsPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaveMessage(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);

    if (res.ok) {
      setSaveMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setError(data?.error ?? "Failed to update password.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Current Password
            </label>
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              New Password
            </label>
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Confirm New Password
            </label>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Update Password"}
          </Button>
          {saveMessage && <p className="text-sm text-teal-light">{saveMessage}</p>}
          {error && <p className="text-sm text-red-light">{error}</p>}
        </form>
      </Card>
    </div>
  );
}
