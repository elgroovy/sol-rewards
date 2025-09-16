import React, { useState } from "react";
import CrtCycler from "./CrtCycler";
import PhysicsTitle from "./PhysicsTitle";
import RewardsCalculatorModal from "./RewardsCalculatorModal";

export default function Fees() {
  const boxes = [
    { p: "10%", l: "TAX", s: "(Buy / Sell / Transfer)" },
    { p: "7%", l: "Holders", s: "Reflections on every trade" },
    { p: "2%", l: "Treasury", s: "Growth & project funding" },
    { p: "1%", l: "Lottery", s: "Jackpot prizes for lucky holders" },
  ];

  const [calcOpen, setCalcOpen] = useState(false);

  return (
    <section id="fees" className="py-20 relative">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <div className="text-center mb-8">
          <PhysicsTitle
            text="FEE STRUCTURE"
            tvSelector="#tv-case"
            onUnlock={() => console.log("TRT unlocked")}
            className="text-5xl md:text-6xl font-extrabold tracking-[.08em]"
          />
        </div>

        <div className="mt-10">
          {/* TV stays centered; allow content to spill on the right for the button */}
          <div id="tv-case" className="relative w-[600px] mx-auto overflow-visible">
            {/* Screen area inside the frame */}
            <div
              className="absolute"
              style={{ top: "10%", left: "10%", width: "65%", height: "55%" }}
            >
              <CrtCycler items={boxes} />
            </div>

            {/* TV frame (non-interactive, sits below the button) */}
            <img
              src="/crt_tv_frame.png"
              alt="CRT TV frame"
              className="relative z-10 pointer-events-none w-full h-auto"
            />

            {/* ONE button, pinned to the TV’s right edge */}
            <div
              className="absolute top-1/2 -translate-y-1/2 z-20"
              style={{ left: "calc(100% + 24px)" }} // 24px gap from TV
            >
              <button
                onClick={() => setCalcOpen(true)}
                className="rounded-2xl px-6 py-3 border border-white/20 bg-white/5 hover:bg-white/10 transition font-semibold shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
              >
                Calculate Rewards
              </button>
            </div>
          </div>
        </div>
      </div>

      <RewardsCalculatorModal open={calcOpen} onClose={() => setCalcOpen(false)} />
    </section>
  );
}
