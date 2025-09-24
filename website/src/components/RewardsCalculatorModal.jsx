import React, { useEffect, useMemo, useState } from "react";
import { Constants } from "../../../constants";

/** --- Demo values (easy to swap) --- */

export default function RewardsCalculatorModal({
  open,
  onClose,
  apiBase = "http://localhost:3000", // Constants.kBackendUrl,
  defaultUseLive = false,
}) {
  const [holdings, setHoldings] = useState("1000000");
  const [useLive, setUseLive] = useState(defaultUseLive);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error
  const [simulatedVolume, setSimulatedVolume] = useState("");
  const [activeTab, setActiveTab] = useState("calculator"); // "calculator" or "my-earnings"
  const [walletAddress, setWalletAddress] = useState("");
  const [earnings, setEarnings] = useState(null);

  const metrics = useMemo(() => {
    return liveMetrics;
  }, [liveMetrics]);

  const fmtUSD = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 2,
      }),
    []
  );

  const fmtInt = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }),
    []
  );

  const parseHoldings = (s) => {
    const n = Number(String(s).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const formatNumberWithCommas = (numStr) => {
    if (!numStr) return "";
    // Handle decimal part separately
    const parts = numStr.split('.');
    // Format the integer part with commas
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    // Recombine with decimal part if present
    return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
  };


  const data = useMemo(() => {
    if (!metrics) return null;
    const supply = Math.max(0, Number(metrics.circulatingSupply || 0));
    const liveVolume = Math.max(0, Number(metrics.volume24hUSD || 0));
    const volumeForCalculation = simulatedVolume !== "" ? parseHoldings(simulatedVolume) : liveVolume;
    const feeBps = Math.max(0, Number(metrics.rewardsFeeBps || 0));
    const feePct = feeBps / 10_000;

    const userHoldings = parseHoldings(holdings);
    const share = supply > 0 ? Math.min(userHoldings, supply) / supply : 0;

    const pool = volumeForCalculation * feePct;           // daily pool (USD)

    const daily = pool * share;
    const monthly = daily * 30.42;
    const yearly = daily * 365;

    return {
      userHoldings,
      supply,
      volume: liveVolume, // Always display the live volume
      volumeForCalculation, // This is used for projections, can be live or simulated
      feeBps,
      pool,
      daily,
      monthly,
      yearly,
      sharePct: share * 100,
    };
  }, [metrics, holdings, simulatedVolume]);

  /** optional: fetch live metrics on demand */
  const fetchLive = async () => {
    try {
      setStatus("loading");
      const res = await fetch(apiBase + `/api/token-data`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setLiveMetrics({
        volume24hUSD: json.volume,
        circulatingSupply: json.supply,
        rewardsFeeBps: json.fee * 10000, // convert fee to basis points
        lastUpdatedISO: json.lastUpdated,
      });
      setUseLive(true);
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setUseLive(false);
    }
  };

  const fetchEarnings = async () => {
    if (!walletAddress) return;
    try {
      setStatus("loading"); // Use global status for now, could be specific status for earnings later
      const res = await fetch(apiBase + `/api/earnings/${walletAddress}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEarnings(json.totalEarned);
      // Assuming the backend returns lastUpdatedISO for earnings too
      setLiveMetrics((prevMetrics) => ({
        ...prevMetrics,
        lastUpdatedISO: json.lastUpdated,
      }));
      setStatus("ok");
    } catch (e) {
      console.error("Error fetching earnings:", e);
      setStatus("error");
      setEarnings(null);
    }
  };


  useEffect(() => {
    fetchLive();
  }, []);

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

          <div className="mb-6 flex gap-3 text-xl md:text-2xl font-bold tracking-wide">
            <button
              type="button"
              onClick={() => setActiveTab("calculator")}
              className={`pb-2 transition ${
                activeTab === "calculator"
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Rewards Calculator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("my-earnings")}
              className={`pb-2 transition ${
                activeTab === "my-earnings"
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              My Earnings
            </button>
          </div>

          {activeTab === "calculator" && (
            <>
              {/* Content grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* LEFT: inputs + meta */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-5">
                  <label className="block text-sm text-white/70 mb-2">
                    Your TRT Holdings{" "}
                    {data?.userHoldings > 0 && metrics?.circulatingSupply > 0 && (
                      <span className="text-emerald-400">
                        ({(data.userHoldings / metrics.circulatingSupply * 100).toFixed(4)}%)
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9,.]*"
                      value={formatNumberWithCommas(holdings)}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const cleanedValue = inputValue.replace(/[^0-9.]/g, '');
                        const finalValue = cleanedValue.split('.').length > 2 ? `${cleanedValue.split('.')[0]}.${cleanedValue.split('.').slice(1).join('')}` : cleanedValue;
                        
                        // Limit holdings to current circulating supply
                        const numericValue = parseHoldings(finalValue);
                        if (metrics?.circulatingSupply && numericValue > metrics.circulatingSupply) {
                          setHoldings(String(metrics.circulatingSupply));
                        } else {
                          setHoldings(finalValue);
                        }
                      }}
                      placeholder="e.g. 1,000,000"
                      className="w-full bg-transparent outline-none placeholder:text-white/30"
                    />
                    <span className="text-xs text-white/50">TRT</span>
                  </div>

                  {/* quick picks */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      ["100k", "100000"],
                      ["1M", "1000000"],
                      ["10M", "10000000"],
                      ["Max", String(metrics?.circulatingSupply ?? 0)],
                    ].map(([label, val]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                            const numericVal = parseHoldings(val);
                            if (metrics?.circulatingSupply && numericVal > metrics.circulatingSupply) {
                                setHoldings(String(metrics.circulatingSupply));
                            } else {
                                setHoldings(val);
                            }
                        }}
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 transition"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Volume Input */}
                  <label className="block text-sm text-white/70 mt-5 mb-2">Simulated Volume</label>
                  <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9,.]*"
                      value={formatNumberWithCommas(simulatedVolume)}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const cleanedValue = inputValue.replace(/[^0-9.]/g, '');
                        const finalValue = cleanedValue.split('.').length > 2 ? `${cleanedValue.split('.')[0]}.${cleanedValue.split('.').slice(1).join('')}` : cleanedValue;
                        setSimulatedVolume(finalValue);
                      }}
                      placeholder="e.g. 500,000"
                      className="w-full bg-transparent outline-none placeholder:text-white/30"
                    />
                    <span className="text-xs text-white/50">USD</span>
                  </div>
                  <p className="mt-1 text-red-400 text-xs pl-2">
                    leave empty to use actual volume
                  </p>


                  {/* meta */}
                  <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <Meta label="24H VOLUME" value={fmtUSD.format(data?.volume ?? 0)} />
                    <Meta label="HOLDERS FEE" value={`${(metrics?.rewardsFeeBps / 100)?.toFixed(2) ?? 0}%`} />
                    <Meta label="TOTAL SUPPLY" value={fmtInt.format(data?.supply ?? 0)} />
                    <Meta
                      label="Last updated"
                      value={
                        metrics?.lastUpdatedISO
                          ? new Date(metrics.lastUpdatedISO).toLocaleString()
                          : "N/A"
                      }
                    />
                  </div>
                </div>

                {/* RIGHT: neon result cards */}
                <div className="grid gap-4">
                  <NeonCard title="DAILY EARNINGS" value={fmtUSD.format(data?.daily ?? 0)} />
                  <NeonCard title="MONTHLY EARNINGS" value={fmtUSD.format(data?.monthly ?? 0)} />
                  <NeonCard title="YEARLY EARNINGS" value={fmtUSD.format(data?.yearly ?? 0)} />
                </div>
              </div>

              {/* bottom actions */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={fetchLive}
                  disabled={status === "loading"}
                  className={`rounded-2xl px-5 py-3 border transition font-semibold
                    ${status === "ok"
                      ? "border-emerald-400/40 bg-emerald-600/20 cursor-default"
                      : "border-white/15 bg-white/10 hover:bg-white/15"}
                  `}
                >
                  {(status === "ok" && simulatedVolume === "") ? "Fetch live data" : status === "loading" ? "Connecting…" : "Fetch live data"}
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
                * Projections are based on current 24h volume and rewards fee, assuming they remain constant
              </p>
            </>
          )}

          {activeTab === "my-earnings" && (
            <>
              {/* Wallet Address Input */}
              <label className="block text-sm text-white/70 mb-2">Your Wallet Address</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2">
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="e.g. 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                  className="w-full bg-transparent outline-none placeholder:text-white/30"
                />
              </div>

              {/* Check Button */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={fetchEarnings}
                  className="rounded-2xl px-5 py-3 border border-white/15 bg-white/10 hover:bg-white/15 transition font-semibold"
                >
                  Check
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl px-5 py-3 border border-white/15 bg-white/10 hover:bg-white/15 transition font-semibold"
                >
                  Close
              </button>
              </div>

              {/* Total Earned Card */}
              <div className="mt-6">
                <NeonCard title="TOTAL EARNED" value={earnings ? fmtUSD.format(earnings) : "$0.00"} />
              </div>

              {/* Last Updated */}
              <p className="mt-3 text-[11px] text-white/50">
                Last updated: {liveMetrics?.lastUpdatedISO
                  ? new Date(liveMetrics.lastUpdatedISO).toLocaleString()
                  : "N/A"}
              </p>
            </>
          )}
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
