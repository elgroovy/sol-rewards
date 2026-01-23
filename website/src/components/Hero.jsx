import React, { useState, useEffect } from "react";
import useParticleField from "../hooks/useParticleField";
import GlitchTitle from "./GlitchTitle";
import Reveal from "./Reveal";
import AssemblingCA from "./AssemblingCA";
import { Config } from "../utils/config.js";

export default function Hero() {
  const canvasRef = useParticleField();
  
  // State for token stats
  const [stats, setStats] = useState({
    liquidity: 0,
    volume: 0,
    marketCap: 0,
    holders: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch token stats from API
  useEffect(() => {
    const fetchStats = async () => {
    try {
      const response = await fetch(`${Config.backendUrl}/metrics`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
    
      setStats({
        liquidity: data.liquidity || 0,
        volume: data.volume || 0,
        marketCap: data.marketCap || 0,
        holders: data.holders || 0
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching token stats:', error);
      setLoading(false);
    }
  };

    fetchStats();
    
    // Refresh stats every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  // Format number to compact format (e.g., 185720 -> $185.72k)
  const formatCurrency = (num) => {
    if (!num || num === 0) return '$0';
    
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}k`;
    }
    return `$${num.toFixed(2)}`;
  };

  // Format holders count (e.g., 24300 -> 24.3k)
  const formatHolders = (num) => {
    if (!num || num === 0) return '0';
    
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <section id="hero" className="relative min-h-[auto] flex items-center justify-center overflow-visible pb-10">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <canvas ref={canvasRef} />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <Reveal delay={340}>
          {/* Top animation */}
          <div className="flex justify-center mb-4">
            <video
              src="/smiley_face_anim.mp4"
              autoPlay
              loop
              muted
              playsInline
              width={320}
              height={320}
              className="w-[320px] h-[320px]"
              style={{
                objectFit: "cover",
                WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                WebkitMaskSize: "cover",
                maskImage: "radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                maskSize: "cover",
              }}
            />
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="mb-5 gradient-border-text">
            <div>$TRT &bull; POWERED BY SOLANA</div>
          </div>
        </Reveal>

        {/* Title: keep GLITCH style on all sizes.
            - Mobile: 3 stacked GlitchTitle rows (TEST / REWARDS / TOKEN)
            - md+: single-line GlitchTitle */}
        <Reveal delay={140}>
          <div>
            <div className="md:hidden space-y-1">
              <GlitchTitle text="TEST" />
              <GlitchTitle text="REWARDS" />
              <GlitchTitle text="TOKEN" />
            </div>
            <div className="hidden md:block">
              <GlitchTitle text="TEST REWARDS TOKEN" />
            </div>
          </div>
        </Reveal>

        {/* Description: one line when space allows; otherwise wrap; never crop */}
        <Reveal delay={240}>
          <p
            className="mt-5 text-lg md:text-xl text-white/80 leading-relaxed px-4 sm:px-0 whitespace-normal break-words"
            style={{ textWrap: "balance" }}
          >
            Started as a test, became the most rewarding token on Solana
          </p>
        </Reveal>

        {/* CTAs: keep button markup/styles EXACTLY; only change layout wrappers.
            - Mobile (md:hidden): TWO centered buttons per row (2 rows).
            - md+: original inline row. */}
        <Reveal delay={340}>
          <div className="mt-8 w-full mx-auto">
            {/* Mobile layout: two centered buttons per row */}
            <div className="md:hidden space-y-4">
              <div className="flex justify-center gap-4">
                <a
                  href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST"
                  className="neon-hover rounded-2xl px-3 py-3 border border-white-400 hover:border-white-300 flex items-center
              bg-transparent hover:bg-fuchsia-500/20 font-semibold transition"
                >
                  <img src="/jup-logo.png" alt="Jupiter Logo" className="inline-block mr-2 h-5 align-middle" />
                  BUY ON JUPITER
                </a>

                <a
                  href="https://dexscreener.com/solana/2hdes5rjlmoanb9hjskfffx62pciqrfi5q86cptckjef"
                  className="neon-hover rounded-2xl px-3 py-3 border border-white-400 hover:border-white-300 flex items-center bg-transparent hover:bg-green-500/20 font-semibold transition"
                >
                  <img src="https://dexscreener.com/favicon.ico" alt="DexScreener Logo" className="inline-block mr-2 h-5 align-middle" />
                  CHART
                </a>
              </div>

              <div className="flex justify-center gap-4">
                <a
                  href="https://trt-2.gitbook.io/test-rewards-token"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neon-hover rounded-2xl px-3 py-3 border border-white-400 hover:border-white-300 flex items-center bg-transparent hover:bg-yellow-500/20 font-semibold transition"
                >
                  <svg className="inline-block mr-2 h-5 w-5 align-middle" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h15v-2H6.012C5.55 19.988 5 19.806 5 19s.55-.988 1.012-1H21V4c0-1.103-.897-2-2-2zm0 14H5V5c0-.806.55-.988 1-1h13v12z"/>
                  </svg>
                  DOCS
                </a>

                <a
                  href="https://x.com/testrewardtoken"
                  className="neon-hover rounded-2xl px-3 py-3 border border-white-400 hover:border-white-300 flex items-center bg-white/0 hover:bg-cyan-400/10 transition font-medium"
                >
                  JOIN{" "}
                  <img src="/x-logo.png" alt="X Logo" className="inline-block ml-2 h-4 align-middle filter invert" />
                </a>

                <a
                  href="https://t.me/TRT_token"
                  className="neon-hover rounded-2xl px-3 py-2 border border-white-400 hover:border-white-300 bg-white/0 hover:bg-cyan-400/10 transition flex items-center justify-center"
                >
                  <img src="/tg-logo.png" alt="Telegram Logo" className="h-8 w-8" />
                </a>
              </div>
            </div>

            {/* Desktop/tablet layout */}
            <div className="hidden md:flex md:flex-wrap md:justify-center md:gap-4">
              <a
                href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST"
                className="neon-hover rounded-2xl px-3 py-3 border border-white-400 hover:border-white-300 flex items-center
              bg-transparent hover:bg-fuchsia-500/20 font-semibold transition"
              >
                <img src="/jup-logo.png" alt="Jupiter Logo" className="inline-block mr-2 h-5 align-middle" />
                BUY ON JUPITER
              </a>

              <a
                href="https://dexscreener.com/solana/2hdes5rjlmoanb9hjskfffx62pciqrfi5q86cptckjef"
                className="neon-hover rounded-2xl px-3 py-3 border border-white-400 hover:border-white-300 flex items-center bg-transparent hover:bg-green-500/20 font-semibold transition"
              >
                <img src="https://dexscreener.com/favicon.ico" alt="DexScreener Logo" className="inline-block mr-2 h-5 align-middle" />
                CHART
              </a>

              <a
                href="https://trt-2.gitbook.io/test-rewards-token"
                target="_blank"
                rel="noopener noreferrer"
                className="neon-hover rounded-2xl px-3 py-3 border border-white-400 hover:border-white-300 flex items-center bg-transparent hover:bg-yellow-500/20 font-semibold transition"
              >
                <svg className="inline-block mr-2 h-5 w-5 align-middle" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h15v-2H6.012C5.55 19.988 5 19.806 5 19s.55-.988 1.012-1H21V4c0-1.103-.897-2-2-2zm0 14H5V5c0-.806.55-.988 1-1h13v12z"/>
                </svg>
                DOCS
              </a>

              <a
                href="https://x.com/testrewardtoken"
                className="neon-hover rounded-2xl px-3 py-3 border border-white-400 hover:border-white-300 flex items-center bg-white/0 hover:bg-cyan-400/10 transition font-medium"
              >
                JOIN{" "}
                <img src="/x-logo.png" alt="X Logo" className="inline-block ml-2 h-4 align-middle filter invert" />
              </a>

              <a
                href="https://t.me/TRT_token"
                className="neon-hover rounded-2xl px-3 py-2 border border-white-400 hover:border-white-300 bg-white/0 hover:bg-cyan-400/10 transition flex items-center justify-center"
              >
                <img src="/tg-logo.png" alt="Telegram Logo" className="h-8 w-8" />
              </a>
            </div>
          </div>
        </Reveal>

        {/* Contract Address assemble animation */}
        <Reveal delay={340}>
          <div className="mt-10">
            <AssemblingCA value="LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST" />
          </div>
        </Reveal>
        
        {/* Stats row */}
        <Reveal delay={420}>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            
            {/* Market Cap */}
            <div className="stat-card-emerald">
              <div>
                <div className="flex items-center justify-center gap-1.5 text-xs md:text-sm uppercase tracking-wider text-white/70 mb-2">
                  <img src="/icon-marketcap.png" alt="" className="w-5 h-5 md:w-6 md:h-6" />
                  Market Cap
                </div>
                <div className="text-2xl md:text-3xl font-bold text-emerald-300">
                  {loading ? (
                    <span className="opacity-50">...</span>
                  ) : (
                    formatCurrency(stats.marketCap)
                  )}
                </div>
              </div>
            </div>

            {/* Liquidity */}
            <div className="stat-card-cyan">
              <div>
                <div className="flex items-center justify-center gap-1.5 text-xs md:text-sm uppercase tracking-wider text-white/70 mb-2">
                  <img src="/icon-liquidity.png" alt="" className="w-5 h-5 md:w-6 md:h-6" />
                  Liquidity
                </div>
                <div className="text-2xl md:text-3xl font-bold text-cyan-300">
                  {loading ? (
                    <span className="opacity-50">...</span>
                  ) : (
                    formatCurrency(stats.liquidity)
                  )}
                </div>
              </div>
            </div>

            {/* Volume */}
            <div className="stat-card-blue">
              <div>
                <div className="flex items-center justify-center gap-1.5 text-xs md:text-sm uppercase tracking-wider text-white/70 mb-2">
                  <img src="/icon-volume.png" alt="" className="w-5 h-5 md:w-6 md:h-6" />
                  Volume 24H
                </div>
                <div className="text-2xl md:text-3xl font-bold text-blue-300">
                  {loading ? (
                    <span className="opacity-50">...</span>
                  ) : (
                    formatCurrency(stats.volume)
                  )}
                </div>
              </div>
            </div>

            {/* Holders */}
            <div className="stat-card-purple">
              <div>
                <div className="flex items-center justify-center gap-1.5 text-xs md:text-sm uppercase tracking-wider text-white/70 mb-2">
                  <img src="/icon-holders.png" alt="" className="w-5 h-5 md:w-6 md:h-6" />
                  Holders
                </div>
                <div className="text-2xl md:text-3xl font-bold text-purple-300">
                  {loading ? (
                    <span className="opacity-50">...</span>
                  ) : (
                    formatHolders(stats.holders)
                  )}
                </div>
              </div>
            </div>

          </div>
        </Reveal>
      </div>

    </section>
  );
}