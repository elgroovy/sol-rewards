import React, { useEffect, useMemo, useState } from "react";

/** --- Demo values (easy to swap) --- */
const DEMO_METRICS = {
  volume24hUSD: 100_000,         // $100k daily volume
  circulatingSupply: 998_948_239,
  rewardsFeeBps: 400,            // 4.00% reflections
  lastUpdatedISO: new Date().toISOString(),
};

export default function RewardsCalculatorModal({
  open,
  onClose,
  apiBase = "",                   // e.g. "https://api.yourdomain.com"
  defaultUseLive = false,         // set true if you want live on by default later
}) {
  const [holdings, setHoldings] = useState("1,000,000");
  const [useLive, setUseLive] = useState(defaultUseLive);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error

  const metrics = useMemo(() => {
    return useLive && liveMetrics ? liveMetrics : DEMO_METRICS;
  }, [useLive, liveMetrics]);

  const fmtUSD = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    []
  );

  const fmtInt = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }),
    []
  );

  const parseHoldings = (s) => {
    const n = Number(String(s).replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const data = useMemo(() => {
    if (!metrics) return null;
    const supply = Math.max(0, Number(metrics.circulatingSupply || 0));
    const volume = Math.max(0, Number(metrics.volume24hUSD || 0));
    const feeBps = Math.max(0, Number(metrics.rewardsFeeBps || 0));
    const feePct = feeBps / 10_000;

    const userHoldings = parseHoldings(holdings);
    const share = supply > 0 ? Math.min(userHoldings, supply) / supply : 0;

    const pool = volume * feePct;           // daily pool (USD)
    const daily = pool * share;
    const monthly = daily * 30.42;
    const yearly = daily * 365;

    return {
      userHoldings,
      supply,
      volume,
      feeBps,
      pool,
      daily,
      monthly,
      yearly,
      sharePct: share * 100,
    };
  }, [metrics, holdings]);

  /** optional: fetch live metrics on demand */
  const fetchLive = async () => {
    try {
      if (!apiBase) { setUseLive(false); return; }
      setStatus("loading");
      const res = await fetch(`${apiBase}/api/trt/metrics`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setLiveMetrics(json);
      setUseLive(true);
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setUseLive(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-3xl rounded-[28px] border border-white/15 bg-white/10 p-6 md:p-8
                     shadow-[inset_0_0_0_1px_rgba(255,255,255,.06),0_30px_80px_rgba(0,0,0,.45)]
                     backdrop-blur-md"
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full
                       border border-white/15 bg-white/10 hover:bg-white/15 transition"
            aria-label="Close"
          >
            ✕
          </button>

          {/* Title */}
          <h3 className="text-xl md:text-2xl font-bold tracking-wide mb-6">Rewards Calculator</h3>

          {/* Content grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* LEFT: inputs + meta */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-5">
              <label className="block text-sm text-white/70 mb-2">Your TRT Holdings</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9,]*"
                  value={holdings}
                  onChange={(e) => setHoldings(e.target.value)}
                  placeholder="e.g., 1,000,000"
                  className="w-full bg-transparent outline-none placeholder:text-white/30"
                />
                <span className="text-xs text-white/50">TRT</span>
              </div>

              {/* quick picks */}
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["100k", "100,000"],
                  ["1M", "1,000,000"],
                  ["Max", fmtInt.format(metrics?.circulatingSupply ?? 0)],
                ].map(([label, val]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setHoldings(val)}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 transition"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* meta */}
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Meta label="Volume" value={fmtUSD.format(data?.volume ?? 0)} />
                <Meta label="Fee" value={`${(metrics?.rewardsFeeBps ?? 0) / 100}%`} />
                <Meta label="Current Supply" value={fmtInt.format(data?.supply ?? 0)} />
                <Meta
                  label="Last updated"
                  value={
                    useLive && metrics?.lastUpdatedISO
                      ? new Date(metrics.lastUpdatedISO).toLocaleString()
                      : "demo"
                  }
                />
              </div>
            </div>

            {/* RIGHT: neon result cards */}
            <div className="grid gap-4">
              <NeonCard title="DAILY EARNINGS" value={fmtUSD.format(data?.daily ?? 0)} />
              <NeonCard title="MONTHLY PROJECTION" value={fmtUSD.format(data?.monthly ?? 0)} />
              <NeonCard title="YEARLY PROJECTION" value={fmtUSD.format(data?.yearly ?? 0)} />
            </div>
          </div>

          {/* bottom actions */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={useLive ? undefined : fetchLive}
              disabled={useLive || status === "loading" || !apiBase}
              className={`rounded-2xl px-5 py-3 border transition font-semibold
                ${useLive
                  ? "border-emerald-400/40 bg-emerald-600/20 cursor-default"
                  : "border-white/15 bg-white/10 hover:bg-white/15"}
              `}
              title={!apiBase ? "Set apiBase prop to enable" : ""}
            >
              {useLive ? "Using live data" : status === "loading" ? "Connecting…" : "Use live data"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl px-5 py-3 border border-white/15 bg-white/10 hover:bg-white/15 transition font-semibold"
            >
              Close
            </button>
          </div>

          {/* tiny status line */}
          <p className="mt-3 text-[11px] text-white/50">
            * Projections are based on current 24h volume and rewards fee, assuming they remain constant.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Small helpers */
function Meta({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-white/45">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function NeonCard({ title, value }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 md:p-5 text-left"
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(135deg, rgba(0,0,0,0.55), rgba(255,255,255,0.04))",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.06) inset, 0 10px 40px rgba(0,0,0,0.4)",
      }}
    >
      <div className="text-xs uppercase tracking-wide text-white/70">{title}</div>
      <div
        className="mt-1 text-2xl md:text-3xl font-bold"
        style={{
          textShadow:
            "0 0 10px rgba(0,255,255,.35), 0 0 18px rgba(255,0,255,.25)",
        }}
      >
        {value}
      </div>
      {/* neon border accent */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          border: "1px solid transparent",
          background:
            "linear-gradient(#0000,#0000), linear-gradient(90deg, rgba(0,255,255,.5), rgba(255,0,255,.5))",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
          opacity: 0.6,
        }}
      />
    </div>
  );
}
