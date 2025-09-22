import React from "react";
import useParticleField from "../hooks/useParticleField";
import GlitchTitle from "./GlitchTitle";
import Reveal from "./Reveal";
import AssemblingCA from "./AssemblingCA";

export default function Hero() {
  const canvasRef = useParticleField();
  return (
    <section id="hero" className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <canvas ref={canvasRef} />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <Reveal delay={340}>
          {/* Top animation (centered, 320x320, soft edge blend) */}
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
          <div className="mb-5 text-xs uppercase tracking-[0.35em] text-cyan-300/80">
            Solana Token — $TRT
          </div>
        </Reveal>


        <Reveal delay={140}>
          <GlitchTitle text="TEST REWARDS TOKEN" />
        </Reveal>

        <Reveal delay={240}>
          <p className="mt-5 text-lg md:text-xl text-white/80 leading-relaxed">
            It started as a test, but it ended up being the best reward token on Solana
          </p>
        </Reveal>

        <Reveal delay={340}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST" className="rounded-2xl px-6 py-3 border border-white-400 hover:border-white-300
              bg-transparent hover:bg-fuchsia-500/20
              font-semibold transition"
            >
              <img src="/jupiter-logo.webp" alt="Jupiter Logo" className="inline-block mr-2 h-5 align-middle" />
              BUY ON JUPITER
            </a>
            <a href="https://dexscreener.com/solana/LVCKzJ9zgzF7nbw8zE7Nxtua4JdAUWfneDNSXVgTEST" className="rounded-2xl px-6 py-3 border border-white-400 hover:border-white-300 bg-transparent hover:bg-green-500/20 font-semibold transition">
              <img src="https://dexscreener.com/favicon.ico" alt="DexScreener Logo" className="inline-block mr-2 h-5 align-middle" />
              CHART
            </a>
            <a href="https://x.com/testrewardtoken" className="rounded-2xl px-6 py-3 border border-white-400 hover:border-white-300 bg-white/0 hover:bg-cyan-400/10 transition font-medium">
              JOIN <img src="/x-logo.png" alt="X Logo" className="inline-block ml-2 h-4 align-middle filter invert" />
            </a>
            <a href="https://t.me/TRT_token" className="rounded-2xl px-4 py-2 border border-white-400 hover:border-white-300 bg-white/0 hover:bg-cyan-400/10 transition flex items-center justify-center">
              <img src="/tg-logo.png" alt="Telegram Logo" className="h-8 w-8" />
            </a>
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
