"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  HEALTH_CONDITIONS,
  LIQUID_ASSETS,
  TOBACCO_STATUSES,
  TOBACCO_STATUS_LABELS,
  MORTGAGE_PURCHASE_TYPES,
  MORTGAGE_PURCHASE_TYPE_LABELS,
  LIFE_INSURANCE_SOURCES,
  LIFE_INSURANCE_SOURCE_LABELS,
  LIFE_INSURANCE_TYPES,
  LIFE_INSURANCE_TYPE_LABELS,
  type LeadType,
} from "@/lib/leadType";

// Mirrors exactly the fields the Lead Detail Panel passes in and the API
// PATCH route accepts — see prisma/schema.prisma's Lead model and
// app/api/agent/leads/[id]/route.ts's SUITABILITY_STRING_FIELDS /
// SUITABILITY_BOOLEAN_FIELDS for the backing columns.
export type SuitabilityLead = {
  id: string;
  leadType: LeadType;
  firstName: string;
  lastName: string;
  age?: number | null;
  dateOfBirth?: string | null;
  address?: string | null;
  occupation?: string | null;
  height?: string | null;
  weight?: string | null;
  tobaccoStatus?: string | null;
  client1Surgeries?: string | null;
  medicalNotes?: string | null;
  client1Bankruptcy?: boolean | null;
  client1DuiFelony?: boolean | null;
  client2FirstName?: string | null;
  client2LastName?: string | null;
  client2Age?: number | null;
  client2Occupation?: string | null;
  client2DateOfBirth?: string | null;
  client2Smoker?: boolean | null;
  client2Height?: string | null;
  client2Weight?: string | null;
  client2Surgeries?: string | null;
  client2Medications?: string | null;
  client2Bankruptcy?: boolean | null;
  client2DuiFelony?: boolean | null;
  healthConditions?: string[];
  income?: string | null;
  significantOther?: string | null;
  additionalIncome?: string | null;
  dependents?: string | null;
  monthlyLeftover?: string | null;
  beneficiary?: string | null;
  beneficiaryRelationship?: string | null;
  mortgageAmount?: string | null;
  mortgageTerm?: string | null;
  mortgagePurchaseType?: string | null;
  homeValue?: string | null;
  homeEquity?: string | null;
  rentOrMortgagePayment?: string | null;
  isForeverHome?: boolean | null;
  howLongWillStay?: string | null;
  hasLifeInsurance?: boolean | null;
  lifeInsuranceSource?: string | null;
  lifeInsuranceType?: string | null;
  lifeInsuranceCompany?: string | null;
  lifeInsuranceFaceAmount?: string | null;
  lifeInsuranceMonthly?: string | null;
  lifeInsuranceSince?: string | null;
  liquidAssets?: string[];
  existingCoverage?: string | null;
  coverageAmountRequested?: string | null;
  coverageEffectiveDate?: string | null;
  recurringDraftDay?: string | null;
  bronzeFaceAmount?: string | null;
  bronzeMonthly?: string | null;
  silverFaceAmount?: string | null;
  silverMonthly?: string | null;
  goldFaceAmount?: string | null;
  goldMonthly?: string | null;
  bankName?: string | null;
  bankRoutingNumber?: string | null;
  bankAccountNumber?: string | null;
  ssn?: string | null;
  driversLicenseNumber?: string | null;
  driversLicenseState?: string | null;
};

type FormValue = string | boolean | number | string[] | null;

const label = "font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase";
const sectionLabel = "font-condensed mb-3 text-[13px] font-extrabold tracking-[0.1em] text-copper uppercase";

export function ClientSuitabilitySheet({ lead, onUpdate }: { lead: SuitabilityLead; onUpdate: (patch: Partial<SuitabilityLead>) => void }) {
  const [form, setForm] = useState<SuitabilityLead>(lead);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function set<K extends keyof SuitabilityLead>(key: K, value: SuitabilityLead[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function commit(key: keyof SuitabilityLead, value: FormValue) {
    if (JSON.stringify(value) === JSON.stringify(lead[key] ?? (Array.isArray(value) ? [] : null))) return;
    setSaving(key);
    try {
      const res = await fetch(`/api/agent/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.lead);
        setSavedAt(Date.now());
      }
    } finally {
      setSaving(null);
    }
  }

  // Plain helper functions (not components — called as {fn(...)}, never as
  // a JSX tag) that build one field's markup inline. Written this way
  // deliberately: a capitalized inner component redefined on every render
  // would get a new identity each time, so React would unmount/remount its
  // input on every keystroke and the field would lose focus after one
  // character. These close over form/set/commit directly instead.
  function textField(field: keyof SuitabilityLead, fieldLabel: string, placeholder?: string, type = "text") {
    const raw = form[field];
    const value = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
    return (
      <div key={field}>
        <label className={label}>{fieldLabel}</label>
        <Input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => set(field, e.target.value as never)}
          onBlur={(e) => commit(field, e.target.value)}
        />
      </div>
    );
  }

  function numField(field: keyof SuitabilityLead, fieldLabel: string) {
    const raw = form[field];
    const value = typeof raw === "number" ? String(raw) : "";
    return (
      <div key={field}>
        <label className={label}>{fieldLabel}</label>
        <Input
          type="number"
          value={value}
          onChange={(e) => set(field, (e.target.value === "" ? null : Number(e.target.value)) as never)}
          onBlur={(e) => commit(field, e.target.value === "" ? null : Number(e.target.value))}
        />
      </div>
    );
  }

  function yesNoField(field: keyof SuitabilityLead, fieldLabel: string) {
    const value = form[field];
    return (
      <div key={field}>
        <label className={label}>{fieldLabel}</label>
        <div className="flex gap-3 pt-1.5">
          {[
            { v: true, l: "Yes" },
            { v: false, l: "No" },
          ].map((opt) => (
            <label key={String(opt.v)} className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="radio"
                checked={value === opt.v}
                onChange={() => {
                  set(field, opt.v as never);
                  commit(field, opt.v);
                }}
              />
              {opt.l}
            </label>
          ))}
        </div>
      </div>
    );
  }

  function checklistField(field: keyof SuitabilityLead, options: readonly string[]) {
    const selected = (form[field] as string[] | undefined) ?? [];
    function toggle(opt: string) {
      const next = selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt];
      set(field, next as never);
      commit(field, next);
    }
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-1.5 text-sm text-foreground">
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Client Suitability Sheet</CardTitle>
        {saving && <span className="text-xs text-muted">Saving…</span>}
        {!saving && savedAt && <span className="text-xs text-muted">Saved</span>}
      </CardHeader>
      <p className="mb-4 text-sm text-muted">
        Fill this in live, on the call — it saves itself as you go, no separate submit step.
      </p>

      <div className="space-y-6">
        {textField("address", "Address", "Street, City, State, ZIP")}

        <div>
          <p className={sectionLabel}>Client 1</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {textField("occupation", "Occupation")}
            <div>
              <label className={label}>Smoker</label>
              <Select
                value={form.tobaccoStatus ?? ""}
                onChange={(e) => {
                  set("tobaccoStatus", e.target.value as never);
                  commit("tobaccoStatus", e.target.value || null);
                }}
              >
                <option value="">—</option>
                {TOBACCO_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TOBACCO_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            {textField("height", "Height", "e.g. 5'10\"")}
            {textField("weight", "Weight", "e.g. 210 lbs")}
            {yesNoField("client1Bankruptcy", "Bankruptcies in last 10 yrs?")}
            {yesNoField("client1DuiFelony", "DUIs or felonies on record?")}
            <div className="sm:col-span-3">
              {textField("client1Surgeries", "Major surgeries in the last 20 years")}
            </div>
            <div className="sm:col-span-3">
              <label className={label}>Prescription Medications</label>
              <textarea
                value={form.medicalNotes ?? ""}
                rows={2}
                onChange={(e) => set("medicalNotes", e.target.value)}
                onBlur={(e) => commit("medicalNotes", e.target.value)}
                className="w-full resize-none rounded-lg border-copper-focus-gradient bg-surface2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <p className={sectionLabel}>Client 2</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {textField("client2FirstName", "First Name")}
            {textField("client2LastName", "Last Name")}
            {numField("client2Age", "Age")}
            {textField("client2Occupation", "Occupation")}
            {textField("client2DateOfBirth", "Date of Birth", undefined, "date")}
            {yesNoField("client2Smoker", "Smoker")}
            {textField("client2Height", "Height", "e.g. 5'4\"")}
            {textField("client2Weight", "Weight", "e.g. 150 lbs")}
            {yesNoField("client2Bankruptcy", "Bankruptcies in last 10 yrs?")}
            {yesNoField("client2DuiFelony", "DUIs or felonies on record?")}
            <div className="sm:col-span-3">
              {textField("client2Surgeries", "Major surgeries in the last 20 years")}
            </div>
            <div className="sm:col-span-3">
              <label className={label}>Prescription Medications</label>
              <textarea
                value={form.client2Medications ?? ""}
                rows={2}
                onChange={(e) => set("client2Medications", e.target.value)}
                onBlur={(e) => commit("client2Medications", e.target.value)}
                className="w-full resize-none rounded-lg border-copper-focus-gradient bg-surface2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <p className={sectionLabel}>Client Health — circle all that apply</p>
          {checklistField("healthConditions", HEALTH_CONDITIONS)}
        </div>

        <div>
          <p className={sectionLabel}>Income &amp; Budget</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {textField("income", "Estimated Monthly Income", "e.g. $4,500/mo")}
            {textField("significantOther", "Significant Other")}
            {textField("additionalIncome", "Additional Income (not SS or salary)")}
            {textField("dependents", "Dependents / Kids in the Home")}
            {textField("monthlyLeftover", "Money Left at End of Month", "after all expenses paid")}
          </div>
        </div>

        {lead.leadType === "MORTGAGE_PROTECTION" && (
          <div>
            <p className={sectionLabel}>Mortgage Protection</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {textField("beneficiary", "Who is the home going to?")}
              {textField("mortgageAmount", "Mortgage Balance")}
              <div>
                <label className={label}>Term</label>
                <Select
                  value={form.mortgageTerm ?? ""}
                  onChange={(e) => {
                    set("mortgageTerm", e.target.value as never);
                    commit("mortgageTerm", e.target.value || null);
                  }}
                >
                  <option value="">—</option>
                  {["15", "20", "30"].map((t) => (
                    <option key={t} value={t}>
                      {t} years
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className={label}>Purchase Type</label>
                <Select
                  value={form.mortgagePurchaseType ?? ""}
                  onChange={(e) => {
                    set("mortgagePurchaseType", e.target.value as never);
                    commit("mortgagePurchaseType", e.target.value || null);
                  }}
                >
                  <option value="">—</option>
                  {MORTGAGE_PURCHASE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {MORTGAGE_PURCHASE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>
              {textField("homeValue", "Home Value")}
              {textField("homeEquity", "Equity")}
              {textField("rentOrMortgagePayment", "Rent / Monthly Payment")}
              {yesNoField("isForeverHome", "Is this your forever home?")}
              {form.isForeverHome === false &&
                textField("howLongWillStay", "If no, how long do you plan to stay there?")}
            </div>
          </div>
        )}

        <div>
          <p className={sectionLabel}>Existing Coverage</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {yesNoField("hasLifeInsurance", "Do you have life insurance?")}
            {form.hasLifeInsurance && (
              <>
                <div>
                  <label className={label}>Private / Work</label>
                  <Select
                    value={form.lifeInsuranceSource ?? ""}
                    onChange={(e) => {
                      set("lifeInsuranceSource", e.target.value as never);
                      commit("lifeInsuranceSource", e.target.value || null);
                    }}
                  >
                    <option value="">—</option>
                    {LIFE_INSURANCE_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {LIFE_INSURANCE_SOURCE_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={label}>Type</label>
                  <Select
                    value={form.lifeInsuranceType ?? ""}
                    onChange={(e) => {
                      set("lifeInsuranceType", e.target.value as never);
                      commit("lifeInsuranceType", e.target.value || null);
                    }}
                  >
                    <option value="">—</option>
                    {LIFE_INSURANCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {LIFE_INSURANCE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </Select>
                </div>
                {textField("lifeInsuranceCompany", "Company")}
                {textField("lifeInsuranceFaceAmount", "Face Amount")}
                {textField("lifeInsuranceMonthly", "Monthly")}
                {textField("lifeInsuranceSince", "How long ago did you get coverage?")}
              </>
            )}
            {textField("existingCoverage", "Existing Coverage Summary", "e.g. $10,000 whole life")}
            {textField("coverageAmountRequested", "Coverage Requested", "e.g. $25,000")}
            <div className="sm:col-span-2">
              <label className={label}>Liquid Assets for an Emergency</label>
              {checklistField("liquidAssets", LIQUID_ASSETS)}
            </div>
          </div>
        </div>

        <div>
          <p className={sectionLabel}>3 Coverage Options</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {textField("coverageEffectiveDate", "Effective Date", undefined, "date")}
            {textField("recurringDraftDay", "Recurring Draft", "e.g. the 5th of each month")}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(["bronze", "silver", "gold"] as const).map((tier) => (
              <div key={tier} className="rounded-lg border border-border bg-surface2 p-3">
                <p className="font-condensed mb-2 text-[11px] font-extrabold tracking-[0.1em] text-copper uppercase">{tier}</p>
                <div className="space-y-2">
                  {textField(`${tier}FaceAmount` as keyof SuitabilityLead, "Face Amount")}
                  {textField(`${tier}Monthly` as keyof SuitabilityLead, "Monthly")}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className={sectionLabel}>Golden Info</p>
          <p className="mb-3 text-xs text-amber">
            Sensitive — banking and identity details. Only fill this in during the e-app, with the client on the line.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {textField("bankName", "Bank")}
            {textField("bankRoutingNumber", "Routing #")}
            {textField("bankAccountNumber", "Account #")}
            {textField("ssn", "SSN")}
            {textField("driversLicenseNumber", "Driver's License #")}
            {textField("driversLicenseState", "State Opened")}
          </div>
        </div>
      </div>
    </Card>
  );
}
