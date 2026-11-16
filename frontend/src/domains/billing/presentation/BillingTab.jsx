import { useState } from "react";
import { Check, Crown, Lock, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useBilling,
  useCheckout,
  useClearDiscount,
  useQuote,
  useRedeem,
} from "@/domains/billing/application/useBilling";

const card = "rounded-xl border border-slate-200 p-4 dark:border-slate-800";

export const money = (minor, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    minor / 100
  );

function Meter({ label, used, max }) {
  const pct = max == null ? 0 : Math.min(100, (used / max) * 100);
  const near = max != null && pct >= 80;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span className="capitalize">{label}</span>
        <span className="tabular-nums">
          {used}
          {max == null ? " · unlimited" : ` of ${max}`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            near ? "bg-amber-500" : "bg-blue-500"
          )}
          style={{ width: max == null ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Price({ plan, title, note, paymentsEnabled }) {
  const { data: q, isError } = useQuote(plan);
  const checkout = useCheckout();
  const clear = useClearDiscount();
  if (!q) return null;
  const discounted = q.discounted < q.original;
  return (
    <div className={cn(card, "flex flex-col")}>
      <p className="text-sm font-medium text-slate-900 dark:text-white">
        {title}
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-slate-900 tabular-nums dark:text-white">
          {money(q.discounted, q.currency)}
        </span>
        {discounted && (
          <span className="text-sm text-slate-400 line-through">
            {money(q.original, q.currency)}
          </span>
        )}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {note}
        {discounted && ` · discount for ${q.appliesFor}`}
      </p>
      {discounted && (
        <button
          onClick={() => clear.mutate()}
          className="mt-1 flex items-center gap-1 self-start text-xs text-slate-400 hover:text-slate-600"
        >
          <X className="h-3 w-3" /> Remove code {q.code}
        </button>
      )}
      <button
        disabled={!paymentsEnabled || checkout.isPending || isError}
        onClick={() => checkout.mutate(plan)}
        className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {paymentsEnabled ? "Upgrade" : "Payments coming soon"}
      </button>
    </div>
  );
}

/** Plan, usage, upgrade and codes. */
export default function BillingTab() {
  const { data: b } = useBilling();
  const redeem = useRedeem();
  const [code, setCode] = useState("");
  if (!b) return null;

  const pro = b.plan === "pro";
  const submit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    redeem.mutate(code, { onSuccess: () => setCode("") });
  };

  return (
    <div className="space-y-5">
      <div
        className={cn(
          card,
          pro &&
            "border-blue-200 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/5"
        )}
      >
        <div className="flex items-center gap-2">
          <Crown
            className={cn("h-5 w-5", pro ? "text-blue-600" : "text-slate-400")}
          />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
            {pro ? "Pro" : "Free plan"}
          </h3>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {!pro && "Upgrade for unlimited bookmarks and every feature."}
          {pro && b.source === "lifetime" && "You have Pro for life."}
          {pro &&
            b.source === "code" &&
            `Access from a code, until ${new Date(b.until).toLocaleDateString()}.`}
          {pro &&
            b.source === "subscription" &&
            (b.subscriptionStatus === "canceled"
              ? `Cancelled. Pro continues until ${new Date(b.until).toLocaleDateString()}.`
              : b.until
                ? `Renews ${new Date(b.until).toLocaleDateString()}.`
                : "Subscription active.")}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Object.entries(b.usage).map(([key, used]) => (
            <Meter
              key={key}
              label={b.labels.limits[key]}
              used={used}
              max={b.limits[key]}
            />
          ))}
        </div>
      </div>

      <div className={card}>
        <h4 className="font-medium text-slate-900 dark:text-white">
          What Pro adds
        </h4>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(b.labels.features).map(([key, label]) => (
            <li
              key={key}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-300"
            >
              {b.features[key] ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Lock className="h-4 w-4 text-slate-400" />
              )}
              {label}
            </li>
          ))}
          <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Unlimited bookmarks, collections and saved views
          </li>
        </ul>
      </div>

      {!pro && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Price
            plan="monthly"
            title="Monthly"
            note="per month"
            paymentsEnabled={b.paymentsEnabled}
          />
          <Price
            plan="yearly"
            title="Yearly"
            note="per year"
            paymentsEnabled={b.paymentsEnabled}
          />
        </div>
      )}

      <form onSubmit={submit} className={card}>
        <h4 className="font-medium text-slate-900 dark:text-white">
          Have a code?
        </h4>
        <p className="mt-1 text-sm text-slate-500">
          Access codes unlock Pro straight away. Discount codes lower the price
          when you upgrade.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm uppercase outline-none focus:border-blue-500 dark:border-slate-700"
          />
          <button
            disabled={redeem.isPending || !code.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            Apply
          </button>
        </div>
      </form>
    </div>
  );
}
