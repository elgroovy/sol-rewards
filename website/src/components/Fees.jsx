import React, { useState } from "react";
import CrtCycler from "./CrtCycler";
import PhysicsTitle from "./PhysicsTitle";
import RewardsCalculatorModal from "./RewardsCalculatorModal";
import Reveal from "./Reveal";

export default function Fees() {
  const boxes = [
    { p: "10%", l: "TAX", s: "(Buy / Sell / Transfer)" },
    { p: "5%", l: "Holders", s: "Reflections on every trade" },
    { p: "3%", l: "Lottery", s: "Jackpot prizes for lucky holders" },
    { p: "2%", l: "Buyback / Liquidity", s: "Automated buybacks and liquidity growth" },
  ];

  const [calcOpen, setCalcOpen] = useState(false);
  const [showThumbsUp, setShowThumbsUp] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  const handleFingerClick = () => {
    setShowThumbsUp(true);
    setTimeout(() => {
      setShowThumbsUp(false);
    }, 1000);
  };

  const handleMoneyClick = () => {
    if (!isFlipping) {
      setIsFlipping(true);
      setTimeout(() => {
        setIsFlipping(false);
      }, 600); // Match animation duration
    }
  };

  return (
    <section id="fees" className="py-20 relative overflow-visible">
      {/* CSS for animations */}
      <style>{`
        @keyframes bounceUpDown {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes backflip {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-60px) rotate(180deg);
          }
          100% {
            transform: translateY(0) rotate(360deg);
          }
        }
        
        .backflip-animation {
          animation: backflip 0.4s ease-in-out;
        }
      `}</style>
      <div className="mx-auto max-w-6xl px-6 text-center relative overflow-visible">
        
        {/* Animated money character - desktop: positioned on the left */}
        <div className="hidden md:block absolute -top-16 left-4 lg:left-16 z-10">
          <img 
            src="/money-character.gif" 
            alt="Money character"
            onClick={handleMoneyClick}
            className={`w-36 lg:w-44 h-auto cursor-pointer transition-transform hover:scale-105 ${isFlipping ? 'backflip-animation' : ''}`}
          />
        </div>

        {/* Animated money character - mobile: centered above title */}
        <div className="md:hidden flex justify-center mb-4 -mt-8">
          <img 
            src="/money-character.gif" 
            alt="Money character"
            onClick={handleMoneyClick}
            className={`w-28 h-auto cursor-pointer transition-transform hover:scale-105 ${isFlipping ? 'backflip-animation' : ''}`}
          />
        </div>

        <div className="text-center mb-8">
          <PhysicsTitle
            text="FEE STRUCTURE"
            tvSelector="#tv-case"
            onUnlock={() => console.log("TRT unlocked")}
            className="text-4xl md:text-6xl font-extrabold tracking-[.08em]"
          />
        </div>

        <Reveal delay={120}>
          <div className="mt-10">
            {/* TV stays centered; allow content to spill on the right for the button */}
            <div id="tv-case" className="relative mx-auto overflow-visible w-full max-w-[92vw] md:w-[600px]">
              {/* Screen area inside the frame */}
              <div
                className="absolute aspect-[4/3.2] top-[8%] md:top-[10%]"
                style={{ left: "10%", width: "65%" }}
              >
                <CrtCycler items={boxes} />
              </div>

              {/* TV frame (non-interactive, sits below the button) */}
              <img
                src="/crt_tv_frame.png"
                alt="CRT TV frame"
                className="relative z-10 pointer-events-none w-full h-auto"
              />

              {/* ONE button, pinned to the TV's right edge */}
              <div
                className="md:absolute md:top-[10%] z-20 mt-4 md:mt-0 flex md:block justify-center"
                style={{ left: "calc(100% + 24px)" }} // 24px gap from TV
              >
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setCalcOpen(true)}
                    className="rounded-2xl px-6 py-3 border border-white/20 bg-white/5 hover:bg-white/10 transition font-semibold shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
                  >
                    Calculate Rewards
                  </button>
                  
                  {/* Animated pointing finger */}
                  <div 
                    onClick={handleFingerClick}
                    className="mt-6 cursor-pointer transition-transform hover:scale-110"
                    style={{
                      animation: 'bounceUpDown 1.5s ease-in-out infinite',
                    }}
                  >
                    <img 
                      src={showThumbsUp ? "/thumbs_up_hand.png" : "/pointing_hand.png"}
                      alt={showThumbsUp ? "Thumbs up" : "Click here"}
                      className="w-16 h-auto transition-opacity duration-200"
                      style={{
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <RewardsCalculatorModal open={calcOpen} onClose={() => setCalcOpen(false)} />
    </section>
  );
}