"use client";

import { useState } from "react";
import { UserSearch } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { US_STATES } from "@/lib/usStates";
import { buildTruePeopleSearchUrl } from "@/lib/truePeopleSearch";

type Mode = "name" | "phone" | "address";

const MODES: { id: Mode; label: string }[] = [
  { id: "name", label: "Name + State" },
  { id: "phone", label: "Phone Number" },
  { id: "address", label: "Address" },
];

export function PeopleSearchButton() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("name");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [zip, setZip] = useState("");

  const canSearch =
    mode === "name"
      ? firstName.trim().length > 0 || lastName.trim().length > 0
      : mode === "phone"
        ? phone.replace(/\D/g, "").length >= 10
        : street.trim().length > 0;

  function handleSearch() {
    const url =
      mode === "name"
        ? buildTruePeopleSearchUrl({
            mode: "name",
            firstName,
            lastName,
            state: state || undefined,
          })
        : mode === "phone"
          ? buildTruePeopleSearchUrl({ mode: "phone", phone })
          : buildTruePeopleSearchUrl({
              mode: "address",
              street,
              city,
              state: addressState,
              zip: zip || undefined,
            });

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-condensed inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:border-copper-dim-gradient hover:text-white"
      >
        <UserSearch className="h-4 w-4" />
        People Search
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="People Search"
        maxWidthClassName="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Opens a prefilled search on{" "}
            <span className="font-semibold text-foreground">
              TruePeopleSearch.com
            </span>{" "}
            in a new tab — results come from them, not from this platform.
          </p>

          <div className="flex gap-1.5 rounded-lg border border-border bg-black/20 p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`font-condensed flex-1 rounded-md px-2 py-1.5 text-[11px] font-bold tracking-[0.06em] uppercase transition-colors ${
                  mode === m.id
                    ? "bg-surface2 text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "name" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                    First Name
                  </label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                    Last Name
                  </label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                  State (optional)
                </label>
                <Select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">Any state</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {mode === "phone" && (
            <div>
              <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                Phone Number
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
          )}

          {mode === "address" && (
            <div className="space-y-3">
              <div>
                <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                  Street Address
                </label>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                    City
                  </label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                    Zip
                  </label>
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                  State
                </label>
                <Select
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                >
                  <option value="">Select state...</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          <Button
            variant="secondary"
            className="w-full"
            onClick={handleSearch}
            disabled={!canSearch}
          >
            Search TruePeopleSearch
          </Button>
        </div>
      </Modal>
    </>
  );
}
