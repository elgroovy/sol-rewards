import React, { useMemo, useRef, useState, useEffect } from "react";

/**
 * RewardsCalculatorModal
 * - Calculator tab: numeric formatting, quick-sets, simulated volume, live fetch.
 * - My earnings tab: address lookup with optional full-history scan + progress UI.
 *
 * Props:
 *   open: boolean
 *   onClose: fn
 *   apiBase?: string ("" or undefined = same-origin)
 *   defaultUseLive?: boolean
 */

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
  scannedTxCount: 150,
  lastSignatureScanned: null,
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

// ---------- small UI bits ----------
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
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          border: "1px solid transparent",
          background:
            "linear-gradient(#0000,#0000), linear-gradient(90deg, rgba(0,255,255,.35), rgba(255,0,255,.35))",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
          opacity: 0.5,
        }}
      />
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="rounded-xl border border-white/12 bg-black/30 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export default function RewardsCalculatorModal({
  open,
  onClose,
  apiBase = "http://localhost:3000", // Constants.kBackendUrl,
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
      const metricsUrl = apiBase ? `${apiBase}/api/metrics` : `/api/metrics`;
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

  // ---------- Wallet / My Earnings ----------
  const [addr, setAddr] = useState("");
  const [earnings, setEarnings] = useState(null);
  const [earnStatus, setEarnStatus] = useState("idle"); // idle | loading | scanning | ok | error
  const [scanAll, setScanAll] = useState(false);

  const [pagesScanned, setPagesScanned] = useState(0);
  const [txScanned, setTxScanned] = useState(0);
  const [lastSig, setLastSig] = useState(null);
  const abortRef = useRef(false);

  const PAGE_LIMIT = 200;  // tx per backend call
  const MAX_PAGES = 100;   // safe cap; progress uses this as denominator

  const addItemsInto = (acc, items) => {
    for (const it of items || []) {
      const key = it.mint || it.symbol || "UNKNOWN";
      acc[key] = (acc[key] || 0) + Number(it.amount || 0);
    }
  };

  const checkEarnings = async () => {
    const a = addr.trim();
    if (!a) return;

    if (!apiBase) {
      setEarnings(DEMO_EARNINGS);
      setEarnStatus("ok");
      return;
    }

    abortRef.current = false;
    setPagesScanned(0);
    setTxScanned(0);
    setLastSig(null);

    if (!scanAll) {
      setEarnStatus("loading");
      try {
        const url = new URL(`${apiBase}/api/earnings`);
        url.searchParams.set("address", a);
        url.searchParams.set("limit", String(PAGE_LIMIT));
        const r = await fetch(url.toString(), { cache: "no-store" });
        const j = await r.json();
        setEarnings(j);
        setPagesScanned(1);
        setTxScanned(j.scannedTxCount || 0);
        setLastSig(j.lastSignatureScanned || null);
        setEarnStatus("ok");
      } catch {
        setEarnStatus("error");
      }
      return;
    }

    // Scan all history (paginated)
    setEarnStatus("scanning");
    try {
      let before = undefined;
      let page = 0;
      let more = true;

      const mintTotals = {};
      let totalScanned = 0;
      let lastSeenSig = null;

      while (more && page < MAX_PAGES && !abortRef.current) {
        page += 1;
        const url = new URL(`${apiBase}/api/earnings`);
        url.searchParams.set("address", a);
        url.searchParams.set("limit", String(PAGE_LIMIT));
        if (before) url.searchParams.set("before", before);

        const r = await fetch(url.toString(), { cache: "no-store" });
        if (!r.ok) throw new Error("backend error");
        const j = await r.json();

        addItemsInto(mintTotals, j.items);
        totalScanned += j.scannedTxCount || 0;
        lastSeenSig = j.lastSignatureScanned || null;

        setPagesScanned(page);
        setTxScanned(totalScanned);
        setLastSig(lastSeenSig);

        if (!lastSeenSig || (j.scannedTxCount || 0) === 0) {
          more = false;
        } else {
          before = lastSeenSig;
        }
      }

      const items = Object.entries(mintTotals).map(([mint, amount]) => ({
        mint,
        symbol: mint.length === 44 ? null : mint,
        amount,
      }));

      setEarnings({
        address: a,
        items,
        scannedTxCount: totalScanned,
        lastSignatureScanned: lastSeenSig,
        lastUpdatedISO: new Date().toISOString(),
      });

      setEarnStatus(abortRef.current ? "idle" : "ok");
    } catch {
      setEarnStatus("error");
    }
  };

  const cancelScan = () => {
    abortRef.current = true;
  };

  const totalUSDFromUSDC = useMemo(() => {
    const items = earnings?.items || [];
    const usdc = items.filter((i) => (i.symbol || "").toUpperCase() === "USDC");
    return usdc.reduce((s, x) => s + Number(x.amount || 0), 0);
  }, [earnings]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center px-4"
      style={{
        background: "rgba(4,8,16,0.45)",
        backdropFilter: "blur(10px)",
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* panel glass look */}
      <div
        className="relative w-full max-w-4xl rounded-[28px] p-6 md:p-8 border shadow-[0_30px_80px_rgba(0,0,0,.45)] backdrop-blur-xl"
        style={{
          overflow: "hidden",
          borderColor: "rgba(255,255,255,0.22)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))",
          WebkitBackdropFilter: "blur(14px) saturate(140%)",
          backdropFilter: "blur(14px) saturate(140%)",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.45)",
        }}
      >
        {/* close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border bg-white/10 hover:bg-white/15 transition z-[2]"
          style={{ borderColor: "rgba(255,255,255,0.22)" }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* title + tabs  */}
        <div className="mb-6 flex items-center justify-between gap-3 pr-12">
          <h3 className="text-xl md:text-2xl font-bold tracking-wide">Rewards Calculator</h3>
          <div className="rounded-full border border-white/20 bg-white/10 p-1 flex mr-2">
            <button
              onClick={() => setView("calc")}
              className={`px-3 py-1.5 rounded-full text-sm ${
                view === "calc" ? "bg-white/25 font-semibold" : "text-white/80 hover:bg-white/15"
              }`}
            >
              Calculator
            </button>
            <button
              onClick={() => setView("wallet")}
              className={`px-3 py-1.5 rounded-full text-sm ${
                view === "wallet" ? "bg-white/25 font-semibold" : "text-white/80 hover:bg-white/15"
              }`}
            >
              My earnings
            </button>
          </div>
        </div>

        {view === "calc" ? (
          // ---------------- CALCULATOR ----------------
          <div className="grid md:grid-cols-2 gap-6">
            {/* left */}
            <div className="rounded-2xl border border-white/15 bg-black/30 p-4 md:p-5">
              <label className="block text-sm text-white/70 mb-2">
                Your TRT Holdings{" "}
                <span className="text-emerald-400/80">
                  ({(pctOfSupply * 100 || 0).toFixed(5)}%)
                </span>
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={holdingsInput}
                  onChange={onHoldingsChange}
                  onKeyDown={onNumericKeyDown}
                  placeholder="1,000,000"
                  className="w-full bg-transparent outline-none placeholder:text-white/30"
                />
                <span className="text-sm opacity-70">TRT</span>
              </div>

              {/* quick buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setQuick(100_000)}
                  className="rounded-full px-3 py-1.5 border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
                >
                  100k
                </button>
                <button
                  onClick={() => setQuick(1_000_000)}
                  className="rounded-full px-3 py-1.5 border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
                >
                  1M
                </button>
                <button
                  onClick={() => setQuick(10_000_000)}
                  className="rounded-full px-3 py-1.5 border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
                >
                  10M
                </button>
                <button
                  onClick={setMax}
                  className="rounded-full px-3 py-1.5 border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
                  title={`Set to Max (${fmtInt(Number(metrics.supply || 0))})`}
                >
                  Max
                </button>
              </div>

              {/* Simulated Volume */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-white/70">Simulated Volume</label>
                  <span className="text-xs text-red-300/80">leave empty to use actual volume</span>
                </div>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={simVolInput}
                    onChange={onSimVolChange}
                    onKeyDown={onNumericKeyDown}
                    placeholder="1,000,000"
                    className="w-full bg-transparent outline-none placeholder:text-white/30"
                  />
                  <span className="text-sm opacity-70">USD</span>
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

              {/* optional error text */}
              {status === "error" && (
                <div className="mt-3 text-sm text-red-300">
                  Couldn’t load live metrics.
                </div>
              )}
            </div>

            {/* right */}
            <div className="grid gap-4">
              <NeonCard title="DAILY EARNINGS" value={fmtUSD.format(daily || 0)} />
              <NeonCard title="MONTHLY EARNINGS" value={fmtUSD.format(monthly || 0)} />
              <NeonCard title="YEARLY EARNINGS" value={fmtUSD.format(yearly || 0)} />
            </div>
          </div>
        ) : (
          // ---------------- MY EARNINGS ----------------
          <div className="grid md:grid-cols-2 gap-6">
            {/* left: address + controls */}
            <div className="rounded-2xl border border-white/15 bg-black/30 p-4 md:p-5">
              <label className="block text-sm text-white/70 mb-2">Your wallet address</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2">
                <input
                  type="text"
                  value={addr}
                  onChange={(e) => setAddr(e.target.value)}
                  placeholder="Enter your address"
                  className="w-full bg-transparent outline-none placeholder:text-white/30"
                />
                <button
                  onClick={checkEarnings}
                  disabled={earnStatus === "loading" || earnStatus === "scanning" || !addr.trim()}
                  className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 disabled:opacity-50"
                >
                  {earnStatus === "scanning"
                    ? "Scanning…"
                    : earnStatus === "loading"
                    ? "Checking…"
                    : "Check"}
                </button>
              </div>

              {/* scan-all toggle */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  id="scanAll"
                  type="checkbox"
                  checked={scanAll}
                  onChange={(e) => setScanAll(e.target.checked)}
                  className="h-4 w-4 rounded border-white/25 bg-black/40"
                />
                <label htmlFor="scanAll" className="text-sm opacity-80">
                  Scan all history (slower)
                </label>
              </div>

              {/* progress UI (kept for earnings scan) */}
              {(earnStatus === "scanning" || earnStatus === "loading") && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="opacity-80">
                      {earnStatus === "scanning" ? "Scanning pages…" : "Fetching…"}
                    </span>
                    <button
                      onClick={cancelScan}
                      disabled={earnStatus !== "scanning"}
                      className="text-xs rounded-md border border-white/20 px-2 py-1 bg-white/10 hover:bg-white/15 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    {earnStatus === "scanning" ? (
                      <div
                        className="h-full bg-white/60"
                        style={{
                          width: `${Math.min(100, (pagesScanned / MAX_PAGES) * 100)}%`,
                          transition: "width 200ms linear",
                        }}
                      />
                    ) : (
                      <div className="h-full w-1/3 bg-white/60 animate-pulse" />
                    )}
                  </div>

                  <div className="mt-2 text-xs opacity-75">
                    <div>Pages scanned: {pagesScanned} / {MAX_PAGES}</div>
                    <div>Signatures scanned: {txScanned.toLocaleString()}</div>
                    {lastSig && (
                      <div className="truncate">
                        Last cursor: <span className="opacity-60">{lastSig}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

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

              {earnStatus === "error" && (
                <div className="mt-3 text-sm text-red-300">Couldn’t load earnings for this address.</div>
              )}
            </div>

            {/* right: totals */}
            <div className="grid gap-4">
              <NeonCard title="TOTAL EARNED (USDC-like)" value={fmtUSD.format(totalUSDFromUSDC || 0)} />
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs uppercase tracking-wide text-white/70 mb-2">
                  Per-asset totals (raw)
                </div>
                <div className="space-y-1 text-sm">
                  {(earnings?.items || []).length === 0 ? (
                    <div className="opacity-60">—</div>
                  ) : (
                    (earnings?.items || []).map((i) => (
                      <div key={i.mint} className="flex justify-between">
                        <span className="opacity-80">
                          {i.symbol || i.mint.slice(0, 4) + "…" + i.mint.slice(-4)}
                        </span>
                        <span className="font-medium">{Number(i.amount).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* footer actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          {view === "calc" ? (
            <button
              type="button"
              onClick={fetchLive}
              /* refreshable button */
              disabled={status === "loading"}
              className={`rounded-2xl px-5 py-3 border transition font-semibold
                ${
                  useLive
                    ? "border-emerald-400/40 bg-emerald-600/20 hover:bg-emerald-600/25"
                    : "border-white/15 bg-white/10 hover:bg-white/15"
                }`}
            >
              {status === "loading"
                ? "Connecting…"
                : useLive
                ? "Refresh live data"
                : "Refresh live data"}
            </button>
          ) : (
            <div className="rounded-2xl px-5 py-3 border border-white/15 bg-white/10 text-left text-sm opacity-80">
              * Scanning paginates with a safe cap of 100 pages (~20000 signatures).
            </div>
          )}

          <button
            onClick={onClose}
            className="rounded-2xl px-5 py-3 border border-white/20 bg-white/10 hover:bg-white/15 transition font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
