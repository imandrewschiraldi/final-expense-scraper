"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StateMultiSelect } from "@/components/shared/StateMultiSelect";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "AGENT";
  licensedStates: string[];
  profileImageUrl: string | null;
  compLevel: string | null;
};

export function ProfilePanel() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editStates, setEditStates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.profile);
        setEditStates(data.profile?.licensedStates ?? []);
      });
  }, []);

  async function saveStates() {
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licensedStates: editStates }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      setSaveMessage("Licensed states saved.");
    } else {
      setError("Failed to save states.");
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

      {(profile.role === "AGENT" || profile.role === "MANAGER") && (
        <Card>
          <CardHeader>
            <CardTitle>Licensed States</CardTitle>
          </CardHeader>
          <StateMultiSelect value={editStates} onChange={setEditStates} />
          <Button className="mt-3" onClick={saveStates} disabled={saving}>
            {saving ? "Saving..." : "Save States"}
          </Button>
          {saveMessage && <p className="mt-2 text-sm text-teal-light">{saveMessage}</p>}
        </Card>
      )}

      {error && <p className="text-sm text-red-light">{error}</p>}
    </div>
  );
}
