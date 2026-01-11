import React, { useState, useRef, useEffect } from "react";
import CurtainIntro from "./components/CurtainIntro";
import Hero from "./components/Hero";
import Utility from "./components/Utility";
import Fees from "./components/Fees";
import SiteFooter from "./components/SiteFooter";

export default function App() {
  const [introComplete, setIntroComplete] = useState(false);
  const audioRef = useRef(null);

  // Lock scroll during intro, unlock and reset when complete
  useEffect(() => {
    if (!introComplete) {
      // Lock scroll
      document.body.style.overflow = "hidden";
    } else {
      // Unlock scroll and reset to top
      document.body.style.overflow = "";
      window.scrollTo(0, 0);
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [introComplete]);

  const handleIntroComplete = () => {
    setIntroComplete(true);
  };

  return (
    <div className="min-h-screen w-full bg-[#070B16] text-white overflow-x-hidden font-sans">
      {/* Background Music */}
      <audio 
        ref={audioRef} 
        loop 
        preload="auto"
        src="/whirlwind_of_joy.mp3"
      />

      {/* Curtain Intro Overlay */}
      {!introComplete && (
        <CurtainIntro
          videoSrc="/curtain-intro.mp4"
          audioRef={audioRef}
          onComplete={handleIntroComplete}
          fadeThreshold={0.8}
        />
      )}

      {/* Main Site Content - only render after intro completes */}
      {introComplete && (
        <>
          <Hero />
          <Utility />
          <Fees />
          <SiteFooter />
        </>
      )}
    </div>
  );
}