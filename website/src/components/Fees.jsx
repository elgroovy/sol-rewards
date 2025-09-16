import React from "react";
import CrtCycler from "./CrtCycler";

export default function Fees() {
  const boxes = [
    { p: "10%", l: "TAX", s: "(Buy / Sell / Transfer)" },
    { p: "7%", l: "Holders", s: "Reflections on every trade" },
    { p: "2%", l: "Treasury", s: "Growth & project funding" },
    { p: "1%", l: "Lottery", s: "Jackpot prizes for lucky holders" },
  ];
  return (
    <section id="fees" className="pt-20 pb-10 relative">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-wide">FEE STRUCTURE</h2>
        <div className="mt-10">
          <div className="relative w-[600px] mx-auto">
            {/* Screen area */}
            <div
              className="absolute"
              style={{
                top: "10%",      // adjust until it matches your TV frame
                left: "10%",     // adjust until it matches your TV frame
                width: "65%",    // the screen width inside bezel
                height: "55%"
              }}
            >
              <CrtCycler items={boxes} />
            </div>

            {/* TV frame overlay */}
            <img
              src="/crt_tv_frame.png"
              alt="CRT TV frame"
              className="relative z-10 pointer-events-none w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
