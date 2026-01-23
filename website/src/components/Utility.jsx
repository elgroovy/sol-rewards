import React from "react";
import Reveal from "./Reveal";

export default function Utility() {
  const items = [
    { t: "Buy $TRT", d: "Load SOL and swap on Raydium DEX" },
    { t: "Daily Rewards", d: "Holders receive reflections automatically" },
    { t: "Win Jackpots", d: "Jackpot rounds for holders" },
  ];
  return (
    <section id="utility" className="py-20 relative">
      <div className="mx-auto max-w-6xl px-6 relative">
        <Reveal direction="left" delay={0}>
          <h2 className="text-2xl md:text-4xl font-bold mb-8">
            Hold & Win <span className="text-cyan-300">Rewards</span>
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((c, i) => (
            <div key={i} className="relative">
              {/* Jackpot character on Win Jackpots card */}
              {i === 2 && (
                <img
                  src="/jackpot-character.gif"
                  alt="Jackpot"
                  className="absolute bottom-0 right-0 md:bottom-auto md:-top-28 md:-right-16 w-28 md:w-48 lg:w-56 h-auto pointer-events-none z-10"
                />
              )}
              <Reveal
                className={`group relative overflow-hidden rounded-2xl border border-white/10
                            bg-white/5 backdrop-blur-sm p-6 transition h-full
                            hover:border-white/20 hover:shadow-2xl hover:-translate-y-0.5`}
                direction={i === 0 ? "left" : i === 1 ? "up" : "right"}
                delay={i * 100}
              >
                {/* metallic sweep (specular highlight) */}
                <div
                  className="pointer-events-none absolute -inset-[40%] rotate-12 opacity-0
                             group-hover:opacity-100 group-hover:[animation:shine_1.1s_ease-out_forwards]"
                >
                  <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent blur-md" />
                </div>
                {/* soft top gloss that fades in */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl
                             bg-[radial-gradient(100%_60%_at_50%_0%,rgba(255,255,255,0.12),transparent_60%)]
                             opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                />
                <div className="text-xl font-semibold mb-2">{c.t}</div>
                <div className="text-white/75">{c.d}</div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
      {/* keyframes for metallic sweep (works with Tailwind's arbitrary [animation:...] class) */}
      <style>{`
        @keyframes shine {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </section>
  );
}