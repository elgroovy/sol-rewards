import React from "react";
import useParticleField from "../hooks/useParticleField";
import GlitchTitle from "./GlitchTitle";
import Reveal from "./Reveal";
import AssemblingCA from "./AssemblingCA";

export default function Hero() {
  const canvasRef = useParticleField();
  return (
    <section id="hero" className="relative min-h-[auto] flex items-center justify-center overflow-hidden pb-10">
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
            It started as a test, but it ended up being the best reward token on Solana
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
      </div>
    </section>
  );
}
