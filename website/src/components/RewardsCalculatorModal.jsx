/**
 * RewardsCalculatorModal
 * - Calculator tab: numeric formatting, quick-sets, simulated volume, live fetch.
 * - My earnings tab: address lookup (DB-backed).
 *
 * Props:
 *   open: boolean
 *   onClose: fn
 *   apiBase?: string ("" or undefined = same-origin)
 *   defaultUseLive?: boolean
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Config } from "../utils/config.js";

const DEMO_METRICS = {
  volumeUSD: 1_000_000,      // 24h volume (USD)
  feePct: 7.0,
  supply: 1_000_000_000,
  lastUpdatedISO: new Date().toISOString(),
};

const DEMO_EARNINGS = {
  address: "DEMOxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  items: [
    { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC", amount: 2580.11 },
    { mint: "So11111111111111111111111111111111111111112", symbol: "SOL", amount: 1.2345 },
  ],
  lastUpdatedISO: new Date().toISOString(),
};

const fmtUSD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const fmtInt = (n) =>
  Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—";

// ---------- numeric helpers ----------
const onlyNumeric = (s) => s.replace(/[^0-9.]/g, "");
const sanitizeNumeric = (s) => {
  s = onlyNumeric(s);
  const first = s.indexOf(".");
  if (first !== -1) s = s.slice(0, first + 1) + s.slice(first + 1).replace(/\./g, "");
  return s;
};
const withCommas = (s) => {
  if (!s) return "";
  const [int, dec] = s.split(".");
  const base = int ? Number(int).toLocaleString("en-US") : "0";
  return dec != null ? `${base}.${dec}` : base;
};
const stripCommas = (s) => (s ? s.replace(/,/g, "") : s);
const toNumber = (s) => {
  const n = Number(stripCommas(s || ""));
  return Number.isFinite(n) ? n : 0;
};

// ---------- THEMED COMPONENTS ----------

function StatCard({ title, value, accent = "amber" }) {
  const accents = {
    amber: {
      border: "linear-gradient(135deg, #F5B971, #C4B5FD)",
      glow: "rgba(245,185,113,.35)",
      titleColor: "rgba(245,185,113,0.8)",
    },
    teal: {
      border: "linear-gradient(135deg, #5EEAD4, #60A5FA)",
      glow: "rgba(94,234,212,.35)",
      titleColor: "rgba(94,234,212,0.8)",
    },
  };

  const a = accents[accent];

  return (
    <div
      className="relative rounded-2xl p-[1.5px]"
      style={{
        background: a.border,
        boxShadow: `0 0 40px ${a.glow}`,
      }}
    >
      <div className="rounded-[14px] bg-[rgba(11,18,32,.75)] px-5 py-4 text-center">
        <div 
          className="text-xs uppercase tracking-wide"
          style={{ color: a.titleColor }}
        >
          {title}
        </div>
        <div className="mt-1 text-2xl md:text-3xl font-semibold text-[#E6EAF2]">
          {value}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-[#9AA4B2]">{label}</div>
      <div className="text-sm font-medium text-[#E6EAF2]">{value}</div>
    </div>
  );
}

// Asset color helper - alternates colors by index
const ASSET_COLORS = [
  "#e3f280ff", // Sky Blue (Replaces Cyan)
  "#A5B4FC", // Indigo-Lavender (Replaces deep purple)
  "#BAE6FD", // Light Azure (Bridge between blues)
  "#C4B5FD", // Soft Violet (Replaces deep Fuchsia)
  "#99F6E4", // Soft Mint (Replaces harsh Teal)
  "#E0E7FF", // Cool White/Grey (Neutral anchor)
  "#DDD6FE", // Dusty Purple (Subtle variation)
  "#F0F9FF", // Ice Blue (Highlight)
];

function getAssetColor(index) {
  return ASSET_COLORS[index % ASSET_COLORS.length];
}

export default function RewardsCalculatorModal({
  open,
  onClose,
  apiBase = Config.backendUrl,
  defaultUseLive = false,
}) {
  const [view, setView] = useState("calc"); // 'calc' | 'wallet'

  // ---------- Calculator ----------
  const [holdingsInput, setHoldingsInput] = useState("1,000,000");
  const [simVolInput, setSimVolInput] = useState(""); // leave empty → use actual volume
  const [useLive, setUseLive] = useState(defaultUseLive);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error

  const metrics = useMemo(
    () => (useLive && liveMetrics ? liveMetrics : DEMO_METRICS),
    [useLive, liveMetrics]
  );

  // numeric values
  const holdings = toNumber(holdingsInput);
  const simVolume = simVolInput.trim() === "" ? null : toNumber(simVolInput);
  const effectiveVolume = simVolume ?? metrics.volumeUSD;

  const pctOfSupply = metrics.supply ? holdings / metrics.supply : 0;
  const fee = (metrics.feePct || 0) / 100;
  const daily = (effectiveVolume || 0) * fee * pctOfSupply;
  const monthly = daily * 30.4167;
  const yearly = daily * 365;

  // quick sets
  const setQuick = (n) => {
    const capped = Math.min(n, Number(metrics.supply || n));
    setHoldingsInput(withCommas(String(capped)));
  };
  const setMax = () =>
    setHoldingsInput(withCommas(String(Math.floor(Number(metrics.supply || 0)))));

  // cap input to supply while typing
  const capToSupply = (rawStr) => {
    const cleaned = sanitizeNumeric(rawStr);
    const asNum = toNumber(withCommas(cleaned));
    const supply = Number(metrics.supply || 0);
    const capped = supply > 0 ? Math.min(asNum, supply) : asNum;
    return withCommas(String(capped));
  };
  const onHoldingsChange = (e) => setHoldingsInput(capToSupply(e.target.value));
  const onSimVolChange = (e) => setSimVolInput(withCommas(sanitizeNumeric(e.target.value)));

  // re-cap if supply changes (e.g., after live fetch)
  useEffect(() => {
    setHoldingsInput((prev) => {
      const capped = capToSupply(prev);
      return capped;
    });
  }, [metrics.supply]);

  const onNumericKeyDown = (e) => {
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End", "Tab"];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/[0-9.]/.test(e.key)) e.preventDefault();
  };

  const fetchLive = async () => {
    setStatus("loading");
    try {
      const metricsUrl = apiBase ? `${apiBase}/metrics` : `/metrics`;
      const r = await fetch(metricsUrl, { cache: "no-store" });
      if (!r.ok) throw new Error("metrics fetch failed");
      const data = await r.json();

      // Map backend fields to UI model
      const mapped = {
        volumeUSD: Number(data.volume || 0),                // backend: volume
        feePct: Number(data.fee || 0) * 100,                // backend: fee in 0..1
        supply: Number(data.supply || 0),                   // backend: supply
        lastUpdatedISO: data.lastUpdated || null,           // backend: lastUpdated
      };

      setLiveMetrics(mapped);
      setUseLive(true);
      setStatus("ok");

      // after new metrics, re-cap holdings to new supply
      setHoldingsInput((prev) => capToSupply(prev));
    } catch {
      setStatus("error");
    }
  };

  // fetch once when modal opens
  useEffect(() => {
    if (open) {
      fetchLive();
    }
  }, [open]);

  // ---------- Wallet / My Earnings (DB-backed; no scan/progress) ----------
  const [addr, setAddr] = useState("");
  const [earnings, setEarnings] = useState(null);
  const [earnLoading, setEarnLoading] = useState(false);
  const [earnError, setEarnError] = useState("");

  // totals for cards
  const solTotal = useMemo(() => {
    const x = (earnings?.items || []).find((i) => (i.symbol || "").toUpperCase() === "SOL");
    return Number(x?.amount || 0);
  }, [earnings]);
  const usdcTotal = useMemo(() => {
    const x = (earnings?.items || []).find((i) => (i.symbol || "").toUpperCase() === "USDC");
    return Number(x?.amount || 0);
  }, [earnings]);

  const otherTokens = useMemo(() => {
    const items = earnings?.items || [];
    return items.filter(
      (i) => (i.symbol || "").toUpperCase() !== "USDC" && (i.symbol || "").toUpperCase() !== "SOL"
    );
  }, [earnings]);

  // recent events state
  const EVENTS_PAGE_SIZE = 10;
  const [events, setEvents] = useState([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsLoading, setEventsLoading] = useState(false);

  // scroll management for recent events
  const eventsScrollRef = useRef(null);
  const prevEventsLenRef = useRef(0);
  useEffect(() => {
    // auto-scroll to newest rows when loading more pages
    if (events.length > prevEventsLenRef.current && eventsPage > 1) {
      if (eventsScrollRef.current) {
        eventsScrollRef.current.scrollTop = eventsScrollRef.current.scrollHeight;
      }
    }
    prevEventsLenRef.current = events.length;
  }, [events, eventsPage]);

  const loadHistory = async (address, page = 1) => {
    if (!apiBase) {
      setEvents([]);
      setEventsTotal(0);
      setEventsPage(1);
      return;
    }
    setEventsLoading(true);
    try {
      const url = new URL(`${apiBase}/earnings/history`);
      url.searchParams.set("address", address);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(EVENTS_PAGE_SIZE));
      const r = await fetch(url.toString(), { cache: "no-store" });
      if (!r.ok) throw new Error("history fetch failed");
      const j = await r.json();
      setEvents(page === 1 ? j.events || [] : [...events, ...(j.events || [])]);
      setEventsTotal(Number(j.total || 0));
      setEventsPage(Number(j.page || page));
    } catch (_e) {
      // keep quiet in UI; recent events are optional
    } finally {
      setEventsLoading(false);
    }
  };

  const checkEarnings = async () => {
    const a = addr.trim();
    if (!a) return;

    setEarnLoading(true);
    setEarnError("");
    try {
      if (!apiBase) {
        setEarnings(DEMO_EARNINGS);
        setEarnLoading(false);
        // demo: no history
        setEvents([]);
        setEventsTotal(0);
        setEventsPage(1);
        return;
      }
      const url = new URL(`${apiBase}/earnings`);
      url.searchParams.set("address", a);
      const r = await fetch(url.toString(), { cache: "no-store" });
      if (!r.ok) throw new Error("earnings fetch failed");
      const j = await r.json();
      setEarnings(j);
      // load recent events (page 1)
      loadHistory(a, 1);
    } catch (e) {
      setEarnings(null);
      setEarnError("Couldn't load earnings for this address.");
      setEvents([]);
      setEventsTotal(0);
      setEventsPage(1);
    } finally {
      setEarnLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 overflow-y-auto overscroll-contain"
      style={{
        background: "rgba(4,8,16,0.45)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        // safe vertical padding for small screens + iOS safe areas
        paddingTop: "1.25rem",
        paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        // ensure at least viewport height so centering behaves
        minHeight: "100dvh",
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Panel with glass look */}
      <div
        className="relative w-full max-w-4xl rounded-[28px] p-6 md:p-8 border shadow-[0_30px_80px_rgba(0,0,0,.45)]"
        style={{
          overflow: "auto",
          borderColor: "rgba(255,255,255,0.20)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))",
          WebkitBackdropFilter: "blur(14px) saturate(140%)",
          backdropFilter: "blur(14px) saturate(140%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.45)",
          maxHeight: "calc(100dvh - 2.5rem)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition z-[2] text-[#E6EAF2]"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Title + tabs */}
        <div className="mb-6 flex items-center justify-between gap-3 pr-12">
          <h3 className="text-xl md:text-2xl font-bold tracking-wide text-[#E6EAF2]">
            Rewards Calculator
          </h3>
          <div className="rounded-full border border-white/20 bg-white/10 p-1 flex mr-2">
            <button
              onClick={() => setView("calc")}
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                view === "calc"
                  ? "bg-[#F5B971]/20 text-[#F5B971] font-semibold"
                  : "text-[#9AA4B2] hover:bg-white/10"
              }`}
            >
              Calculator
            </button>
            <button
              onClick={() => setView("wallet")}
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                view === "wallet"
                  ? "bg-[#F5B971]/20 text-[#F5B971] font-semibold"
                  : "text-[#9AA4B2] hover:bg-white/10"
              }`}
            >
              My Earnings
            </button>
          </div>
        </div>

        {view === "calc" ? (
          // ---------------- CALCULATOR ----------------
          <div className="grid md:grid-cols-2 gap-6">
            {/* left */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-5">
              <label className="block text-sm text-[#9AA4B2] mb-2">
                Your TRT Holdings{" "}
                <span className="text-[#5EEAD4]">
                  ({(pctOfSupply * 100 || 0).toFixed(2)}%)
                </span>
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={holdingsInput}
                  onChange={onHoldingsChange}
                  onKeyDown={onNumericKeyDown}
                  placeholder="1,000,000"
                  className="w-full bg-transparent outline-none placeholder:text-white/30 text-[#E6EAF2]"
                />
                <span className="text-sm text-[#9AA4B2]">TRT</span>
              </div>

              {/* quick buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                {[100_000, 1_000_000, 10_000_000].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuick(n)}
                    className="rounded-full px-3 py-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-[#E6EAF2] transition"
                  >
                    {n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1_000}k`}
                  </button>
                ))}
                <button
                  onClick={setMax}
                  className="rounded-full px-3 py-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-[#E6EAF2] transition"
                  title={`Set to Max (${fmtInt(Number(metrics.supply || 0))})`}
                >
                  Max
                </button>
              </div>

              {/* Simulated Volume */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-[#9AA4B2]">Simulated Volume</label>
                  <span className="text-xs text-red-400/80">leave empty to use actual volume</span>
                </div>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={simVolInput}
                    onChange={onSimVolChange}
                    onKeyDown={onNumericKeyDown}
                    placeholder="1,000,000"
                    className="w-full bg-transparent outline-none placeholder:text-white/30 text-[#E6EAF2]"
                  />
                  <span className="text-sm text-[#9AA4B2]">USD</span>
                </div>
              </div>

              {/* meta */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Meta label="24h Volume" value={fmtUSD.format(metrics.volumeUSD || 0)} />
                <Meta label="Holders Fee" value={`${(metrics.feePct || 0).toFixed(2)}%`} />
                <Meta label="Total Supply" value={fmtInt(Number(metrics.supply || 0))} />
                <Meta
                  label="Last updated"
                  value={
                    metrics.lastUpdatedISO
                      ? new Date(metrics.lastUpdatedISO).toLocaleString()
                      : "—"
                  }
                />
              </div>

              {status === "error" && (
                <div className="mt-3 text-sm text-red-400">
                  Couldn't load live metrics.
                </div>
              )}
            </div>

            {/* right - THEMED CARDS */}
            <div className="grid gap-4">
              <StatCard title="DAILY EARNINGS" value={fmtUSD.format(daily || 0)} accent="amber" />
              <StatCard title="MONTHLY EARNINGS" value={fmtUSD.format(monthly || 0)} accent="amber" />
              <StatCard title="YEARLY EARNINGS" value={fmtUSD.format(yearly || 0)} accent="amber" />
            </div>
          </div>
        ) : (
          // ---------------- MY EARNINGS (DB-backed) ----------------
          <>
            <div className="grid md:grid-cols-2 gap-6">
              {/* left: address + meta */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-5">
                <label className="block text-sm text-[#9AA4B2] mb-2">Your wallet address</label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                  <input
                    type="text"
                    value={addr}
                    onChange={(e) => setAddr(e.target.value)}
                    placeholder="Enter your address"
                    className="w-full bg-transparent outline-none placeholder:text-white/30 text-[#E6EAF2]"
                  />
                  <button
                    onClick={checkEarnings}
                    disabled={earnLoading || !addr.trim()}
                    className="shrink-0 rounded-lg border border-[#F5B971]/30 bg-[#F5B971]/20 px-3 py-1.5 text-sm text-[#F5B971] font-semibold hover:bg-[#F5B971]/30 disabled:opacity-50 transition"
                  >
                    {earnLoading ? "Checking…" : "Check"}
                  </button>
                </div>

                {/* meta */}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Meta
                    label="Last updated"
                    value={
                      earnings?.lastUpdatedISO
                        ? new Date(earnings.lastUpdatedISO).toLocaleString()
                        : "—"
                    }
                  />
                  <Meta
                    label="Address"
                    value={addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : "—"}
                  />
                </div>

                {earnError && (
                  <div className="mt-3 text-sm text-red-400">{earnError}</div>
                )}
              </div>

              {/* right: totals summary - THEMED CARDS */}
              <div className="grid sm:grid-cols-2 gap-4">
                <StatCard
                  title="TOTAL SOL"
                  value={solTotal.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  accent="amber"
                />
                <StatCard
                  title="TOTAL USDC"
                  value={usdcTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  accent="amber"
                />
                <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-wide text-[#9AA4B2] mb-2">
                    Per-asset totals
                  </div>
                  <div className="space-y-1 text-sm">
                    {(earnings?.items || []).length === 0 ? (
                      <div className="text-[#9AA4B2]">—</div>
                    ) : (
                      (earnings?.items || []).map((i, idx) => {
                        const displaySymbol = i.symbol ||
                          (i.mint ? i.mint.slice(0, 4) + "…" + i.mint.slice(-4) : "—");
                        return (
                          <div key={`${i.mint || i.symbol || idx}`} className="flex justify-between">
                            <span style={{ color: getAssetColor(idx) }}>
                              {displaySymbol}
                            </span>
                            <span className="font-medium text-[#E6EAF2]">
                              {Number(i.amount || 0).toLocaleString(undefined, {
                                maximumFractionDigits: 9,
                              })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent events (fixed-height, scrollable) */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-xs uppercase tracking-wide text-[#9AA4B2] mb-3">
                Recent events
              </div>
              <div
                ref={eventsScrollRef}
                style={{ maxHeight: 220, overflowY: "auto" }}
                className="overflow-x-auto"
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-black/40 backdrop-blur">
                    <tr className="text-left">
                      <th className="py-2 pr-3 font-medium text-[#F97316]">Time</th>
                      <th className="py-2 pr-3 font-medium text-[#F97316]">Asset</th>
                      <th className="py-2 pr-3 font-medium text-[#F97316]">Amount</th>
                      <th className="py-2 font-medium text-[#F97316]">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-3 text-[#9AA4B2]">
                          —
                        </td>
                      </tr>
                    ) : (
                      events.map((ev) => {
                        const when = ev.blockTimeISO
                          ? new Date(ev.blockTimeISO).toLocaleString()
                          : "—";
                        const symbol =
                          ev.assetType === "SOL"
                            ? "SOL"
                            : (earnings?.items || []).find((i) => i.mint === ev.tokenMint)?.symbol ||
                              (ev.tokenMint ? ev.tokenMint.slice(0, 4) + "…" + ev.tokenMint.slice(-4) : "SPL");
                        return (
                          <tr key={`${ev.signature}-${ev.tokenMint || "SOL"}`} className="border-t border-white/5">
                            <td className="py-2 pr-3 text-[#E6EAF2]">{when}</td>
                            <td className="py-2 pr-3" style={{ color: getAssetColor(symbol) }}>{symbol}</td>
                            <td className="py-2 pr-3 text-[#E6EAF2]">
                              {Number(ev.amount || 0).toLocaleString(undefined, {
                                maximumFractionDigits: 9,
                              })}
                            </td>
                            <td className="py-2">
                              {ev.signature ? (
                                <a
                                  className="text-[#5EEAD4] hover:underline"
                                  href={`https://solscan.io/tx/${ev.signature}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={ev.signature}
                                >
                                  {ev.signature.slice(0, 6)}…{ev.signature.slice(-4)} ↗
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* load more */}
              {eventsTotal > events.length && (
                <div className="mt-3">
                  <button
                    className="rounded-xl px-3 py-1.5 border border-white/10 bg-white/10 hover:bg-white/15 text-sm text-[#E6EAF2] disabled:opacity-50 transition"
                    disabled={eventsLoading}
                    onClick={() => loadHistory(addr.trim(), eventsPage + 1)}
                  >
                    {eventsLoading ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* footer actions — Calculator tab only */}
        {view === "calc" && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={fetchLive}
              disabled={status === "loading"}
              className={`rounded-2xl px-5 py-3 border transition font-semibold text-[#E6EAF2]
                ${
                  useLive
                    ? "border-[#5EEAD4]/40 bg-[#5EEAD4]/20 hover:bg-[#5EEAD4]/25"
                    : "border-white/10 bg-white/10 hover:bg-white/15"
                }`}
            >
              {status === "loading" ? "Connecting…" : "Refresh Live Data"}
            </button>

            <button
              onClick={onClose}
              className="rounded-2xl px-5 py-3 border border-white/20 bg-white/10 hover:bg-white/15 transition font-semibold text-[#E6EAF2]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}