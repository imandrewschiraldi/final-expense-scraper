"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { StateMultiSelect } from "@/components/shared/StateMultiSelect";
import { US_STATES } from "@/lib/usStates";
import { ROLE_SWITCH_EMAIL, SwitchableRole } from "@/lib/roleSwitch";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "AGENT";
  licensedStates: string[];
  profileImageUrl: string | null;
  compLevel: string | null;
  npn: string | null;
  residentState: string | null;
  demoModeEnabled: boolean;
};

export function ProfilePanel() {
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editStates, setEditStates] = useState<string[]>([]);
  const [editNpn, setEditNpn] = useState("");
  const [editResidentState, setEditResidentState] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [togglingDemoMode, setTogglingDemoMode] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.profile);
        setEditStates(data.profile?.licensedStates ?? []);
        setEditNpn(data.profile?.npn ?? "");
        setEditResidentState(data.profile?.residentState ?? "");
      });
  }, []);

  async function saveDetails() {
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licensedStates: editStates, npn: editNpn, residentState: editResidentState }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      setSaveMessage("Profile details saved.");
    } else {
      setError("Failed to save profile details.");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }

    setChangingPassword(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => null);
    setChangingPassword(false);

    if (res.ok) {
      setPasswordMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordError(data?.error ?? "Failed to update password.");
    }
  }

  async function toggleDemoMode() {
    if (!profile) return;
    const next = !profile.demoModeEnabled;
    setTogglingDemoMode(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demoModeEnabled: next }),
    });
    setTogglingDemoMode(false);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
    } else {
      setError("Failed to toggle Demo Mode.");
    }
  }

  async function switchRole(role: SwitchableRole) {
    setSwitching(true);
    setError(null);
    const res = await fetch("/api/profile/switch-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      // Passing a (even empty) payload is what makes next-auth POST to the
      // session endpoint instead of just GETing the existing one — only the
      // POST path re-runs the jwt callback with trigger:"update", which is
      // what actually refreshes the token. The jwt callback ignores this
      // payload and re-reads the DB directly, so its contents don't matter.
      await updateSession({ role });
      // Hard navigation, not router.push — the new session cookie needs a
      // fresh request through the middleware, and a client-side push here
      // can race the just-applied session update. Always the unified
      // Portal dashboard, not the legacy per-role /admin or /agent
      // dashboards, which both roles can still reach from the sidebar.
      window.location.href = "/portal/dashboard";
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to switch role.");
      setSwitching(false);
    }
  }

  async function handlePictureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/profile/picture", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      setProfile((prev) => (prev ? { ...prev, profileImageUrl: data.profileImageUrl } : prev));
    } else {
      setError(data.error ?? "Failed to upload picture.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!profile) {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Professional Information</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-[1.5px] border-copper-dim bg-surface"
            title="Change profile picture"
          >
            {profile.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profileImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            )}
          </button>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">{profile.name}</p>
            <p className="truncate text-sm text-muted">{profile.email}</p>
            <button
              type="button"
              className="mt-1 text-sm text-teal-light hover:underline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Change picture"}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tier 1 Financial Information</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-condensed text-[11px] font-bold tracking-[0.12em] text-muted uppercase">Role</span>
            <p className="text-white">{profile.role}</p>
          </div>
          {profile.email === ROLE_SWITCH_EMAIL && (
            <div>
              <span className="font-condensed text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                Switch View
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                {(["ADMIN", "MANAGER"] as const).map((role) => (
                  <Button
                    key={role}
                    variant={profile.role === role ? "ghost" : "secondary"}
                    onClick={() => switchRole(role)}
                    disabled={switching || profile.role === role}
                  >
                    {switching ? "Switching..." : role.charAt(0) + role.slice(1).toLowerCase()}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {profile.compLevel && (
            <div>
              <span className="font-condensed text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                Compensation Level
              </span>
              <p className="text-white">{profile.compLevel}</p>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demo Mode</CardTitle>
        </CardHeader>
        <div className="flex items-start justify-between gap-4">
          <p className="max-w-md text-sm text-muted">
            Shows realistic-looking fake production across your Dashboard, Book of Business, and Leaderboard row —
            useful when demoing the system to someone. It&apos;s only ever what appears on your own screen: nothing
            fake is ever written to the real data, and no one else&apos;s view is affected.
          </p>
          <Button
            variant={profile.demoModeEnabled ? "ghost" : "secondary"}
            onClick={toggleDemoMode}
            disabled={togglingDemoMode}
          >
            {togglingDemoMode ? "Saving..." : profile.demoModeEnabled ? "On — Turn Off" : "Off — Turn On"}
          </Button>
        </div>
      </Card>

      {(profile.role === "AGENT" || profile.role === "MANAGER") && (
        <Card>
          <CardHeader>
            <CardTitle>Professional Details</CardTitle>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                NPN (National Producer Number)
              </label>
              <Input value={editNpn} onChange={(e) => setEditNpn(e.target.value)} placeholder="e.g. 1234567" />
            </div>
            <div>
              <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                Resident State
              </label>
              <Select value={editResidentState} onChange={(e) => setEditResidentState(e.target.value)}>
                <option value="">Select state...</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Licensed States
            </label>
            <StateMultiSelect value={editStates} onChange={setEditStates} />
          </div>

          <Button className="mt-4" onClick={saveDetails} disabled={saving}>
            {saving ? "Saving..." : "Save Details"}
          </Button>
          {saveMessage && <p className="mt-2 text-sm text-teal-light">{saveMessage}</p>}
        </Card>
      )}

      {error && <p className="text-sm text-red-light">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <form onSubmit={changePassword} className="max-w-sm space-y-4">
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
          <Button type="submit" disabled={changingPassword}>
            {changingPassword ? "Saving..." : "Update Password"}
          </Button>
          {passwordMessage && <p className="text-sm text-teal-light">{passwordMessage}</p>}
          {passwordError && <p className="text-sm text-red-light">{passwordError}</p>}
        </form>
      </Card>
    </div>
  );
}
