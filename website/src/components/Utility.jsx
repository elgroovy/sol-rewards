import React from "react";

export default function Utility() {
  const items = [
    { t: "Buy $TRT", d: "Load SOL and swap on any DEX." },
    { t: "Daily Rewards", d: "Holders receive reflections automatically." },
    { t: "Win Jackpots", d: "Jackpot rounds for holders." },
  ];
  return (
    <section id="utility" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-2xl md:text-4xl font-bold mb-8">
          Hold & Win <span className="text-cyan-300">Rewards</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((c, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:shadow-lg transition">
              <div className="text-xl font-semibold mb-2">{c.t}</div>
              <div className="text-white/75">{c.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
