import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAdminCoupons,
  useCouponMutations,
} from "@/domains/billing/application/useBilling";

const field =
  "w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700";
const label = "mb-1 block text-xs font-medium text-slate-500";
const card = "rounded-xl border border-slate-200 p-4 dark:border-slate-800";

const STATUS = {
  usable: ["Active", "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10"],
  inactive: ["Off", "text-slate-500 bg-slate-100 dark:bg-slate-800"],
  expired: ["Expired", "text-amber-700 bg-amber-50 dark:bg-amber-500/10"],
  not_started: ["Not started", "text-blue-600 bg-blue-50 dark:bg-blue-500/10"],
  used_up: ["Used up", "text-amber-700 bg-amber-50 dark:bg-amber-500/10"],
};

const describe = (c) => {
  if (c.type === "access")
    return c.lifetime ? "Pro for life" : `${c.accessDays} days of Pro`;
  const off = c.percentOff
    ? `${c.percentOff}% off`
    : `${c.amountOff / 100} off`;
  const how =
    c.duration === "forever"
      ? "every payment"
      : c.duration === "repeating"
        ? `first ${c.durationMonths} months`
        : "first payment";
  return `${off}, ${how}`;
};

const iso = (local) => (local ? new Date(local).toISOString() : undefined);
const blank = {
  type: "access",
  code: "",
  note: "",
  startsAt: "",
  expiresAt: "",
  maxRedemptions: "",
  accessDays: "30",
  lifetime: false,
  percentOff: "20",
  amountOff: "",
  duration: "once",
  durationMonths: "3",
};

/** Create and manage access codes and discount codes. Only shown to admins. */
export default function AdminCodesTab() {
  const { data: coupons = [] } = useAdminCoupons(true);
  const { create, update, remove } = useCouponMutations();
  const [f, setF] = useState(blank);
  const set = (k) => (e) =>
    setF((p) => ({
      ...p,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const submit = (e) => {
    e.preventDefault();
    const body = {
      type: f.type,
      code: f.code.trim() || undefined,
      note: f.note.trim() || undefined,
      startsAt: iso(f.startsAt),
      expiresAt: iso(f.expiresAt),
      maxRedemptions: f.maxRedemptions ? Number(f.maxRedemptions) : undefined,
    };
    if (f.type === "access") {
      if (f.lifetime) body.lifetime = true;
      else body.accessDays = Number(f.accessDays);
    } else {
      if (f.amountOff) body.amountOff = Math.round(Number(f.amountOff) * 100);
      else body.percentOff = Number(f.percentOff);
      body.duration = f.duration;
      if (f.duration === "repeating")
        body.durationMonths = Number(f.durationMonths);
    }
    create.mutate(body, { onSuccess: () => setF(blank) });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
          Codes
        </h3>
        <p className="text-sm text-slate-500">
          Access codes give Pro with no payment. Discount codes lower the price
          at checkout.
        </p>
      </div>

      <form onSubmit={submit} className={cn(card, "space-y-3")}>
        <div className="flex gap-2">
          {["access", "discount"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setF((p) => ({ ...p, type: t }))}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium capitalize",
                f.type === t
                  ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                  : "border-slate-200 text-slate-500 dark:border-slate-700"
              )}
            >
              {t} code
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Code (blank to generate)</label>
            <input
              className={cn(field, "uppercase")}
              value={f.code}
              onChange={set("code")}
              placeholder="WELCOME30"
            />
          </div>
          <div>
            <label className={label}>Note (only you see this)</label>
            <input className={field} value={f.note} onChange={set("note")} />
          </div>

          {f.type === "access" ? (
            <div>
              <label className={label}>How long the access lasts (days)</label>
              <input
                type="number"
                min="1"
                disabled={f.lifetime}
                className={field}
                value={f.accessDays}
                onChange={set("accessDays")}
              />
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={f.lifetime}
                  onChange={set("lifetime")}
                />{" "}
                Pro for life
              </label>
            </div>
          ) : (
            <>
              <div>
                <label className={label}>Percent off</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  disabled={!!f.amountOff}
                  className={field}
                  value={f.percentOff}
                  onChange={set("percentOff")}
                />
              </div>
              <div>
                <label className={label}>
                  …or amount off (instead of percent)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={field}
                  value={f.amountOff}
                  onChange={set("amountOff")}
                  placeholder="5.00"
                />
              </div>
              <div>
                <label className={label}>Discount lasts for</label>
                <select
                  className={field}
                  value={f.duration}
                  onChange={set("duration")}
                >
                  <option value="once">First payment only</option>
                  <option value="repeating">A number of months</option>
                  <option value="forever">Every payment</option>
                </select>
              </div>
              {f.duration === "repeating" && (
                <div>
                  <label className={label}>Months</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    className={field}
                    value={f.durationMonths}
                    onChange={set("durationMonths")}
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className={label}>Can be used from</label>
            <input
              type="datetime-local"
              className={field}
              value={f.startsAt}
              onChange={set("startsAt")}
            />
          </div>
          <div>
            <label className={label}>Can be used until</label>
            <input
              type="datetime-local"
              className={field}
              value={f.expiresAt}
              onChange={set("expiresAt")}
            />
          </div>
          <div>
            <label className={label}>Maximum uses (blank = unlimited)</label>
            <input
              type="number"
              min="1"
              className={field}
              value={f.maxRedemptions}
              onChange={set("maxRedemptions")}
            />
          </div>
        </div>

        <button
          disabled={create.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Create code
        </button>
      </form>

      <div className="space-y-2">
        {coupons.map((c) => {
          const [text, tone] = STATUS[c.status] ?? STATUS.usable;
          return (
            <div
              key={c.id}
              className={cn(card, "flex flex-wrap items-center gap-3")}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <code className="font-semibold text-slate-900 dark:text-white">
                    {c.code}
                  </code>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      tone
                    )}
                  >
                    {text}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  {describe(c)} · used {c.redeemedCount}
                  {c.maxRedemptions != null ? ` of ${c.maxRedemptions}` : ""}
                  {c.expiresAt &&
                    ` · ends ${new Date(c.expiresAt).toLocaleDateString()}`}
                  {c.note && ` · ${c.note}`}
                </p>
              </div>
              <button
                onClick={() => update.mutate({ id: c.id, active: !c.active })}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                {c.active ? "Switch off" : "Switch on"}
              </button>
              <button
                disabled={c.redeemedCount > 0}
                onClick={() => remove.mutate(c.id)}
                title={
                  c.redeemedCount > 0
                    ? "Used codes are kept for the record"
                    : "Delete"
                }
                className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        {coupons.length === 0 && (
          <p className="text-sm text-slate-500">No codes yet.</p>
        )}
      </div>
    </div>
  );
}
