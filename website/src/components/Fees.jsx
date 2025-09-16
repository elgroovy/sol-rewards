import React from "react";

export default function Fees() {
  const boxes = [
    { p: "7%", l: "Holders", s: "Rewards" },
    { p: "2%", l: "Treasury", s: "" },
    { p: "1%", l: "Lottery", s: "Jackpots" },
  ];
  return (
    <section id="fees" className="py-20 relative">
      <div
        className="absolute inset-0 -z-10 opacity-15"
        style={{
          backgroundImage: 'url("/no_signal_anim.gif")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-wide">FEE STRUCTURE</h2>
        <p className="mt-2 text-white/70">10% TAX (BUY / SELL / TRANSFER)</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {boxes.map((b, i) => (
            <div key={i} className="rounded-2xl p-6 border border-white/10 bg-gradient-to-br from-fuchsia-600/10 via-cyan-400/10 to-transparent hover:from-fuchsia-600/20 hover:via-cyan-400/20 transition">
              <div className="text-5xl font-extrabold mb-2">{b.p}</div>
              <div className="text-lg font-semibold">{b.l}</div>
              {b.s && <div className="text-white/70">{b.s}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
