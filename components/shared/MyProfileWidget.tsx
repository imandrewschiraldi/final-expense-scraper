"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { StateMultiSelect } from "@/components/shared/StateMultiSelect";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AGENT";
  licensedStates: string[];
  profileImageUrl: string | null;
  compLevel: string | null;
};

export function MyProfileWidget() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editStates, setEditStates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.profile);
        setEditStates(data.profile?.licensedStates ?? []);
      });
  }, [session?.user]);

  if (!session?.user) return null;

  async function saveStates() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licensedStates: editStates }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
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

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-3 w-80 rounded-xl border-[1.5px] border-copper bg-black p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-condensed text-sm font-bold tracking-[0.08em] text-white uppercase">My Profile</h3>
            <button className="text-muted hover:text-foreground" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          {!profile ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-[1.5px] border-copper-dim bg-surface"
                  title="Change profile picture"
                >
                  {profile.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.profileImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-bold text-muted">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{profile.name}</p>
                  <p className="truncate text-xs text-muted">{profile.email}</p>
                  <button
                    type="button"
                    className="mt-0.5 text-xs text-teal-light hover:underline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Change picture"}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePictureChange}
                />
              </div>

              {profile.compLevel && (
                <div>
                  <span className="font-condensed text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                    Comp Level
                  </span>
                  <p className="text-sm text-white">{profile.compLevel}</p>
                </div>
              )}

              {profile.role === "AGENT" && (
                <div>
                  <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                    Licensed States
                  </label>
                  <StateMultiSelect value={editStates} onChange={setEditStates} />
                  <Button className="mt-2" onClick={saveStates} disabled={saving}>
                    {saving ? "Saving..." : "Save States"}
                  </Button>
                </div>
              )}

              {error && <p className="text-sm text-red-light">{error}</p>}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="font-condensed flex items-center gap-2 rounded-full border-[1.5px] border-copper bg-black px-4 py-2.5 text-[13px] font-bold tracking-[0.05em] text-foreground uppercase shadow-lg transition-colors hover:bg-copper hover:text-black"
      >
        {profile?.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.profileImageUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <span aria-hidden>👤</span>
        )}
        My Profile
      </button>
    </div>
  );
}
