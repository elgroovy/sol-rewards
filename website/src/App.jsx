import React, { useState, useRef, useEffect, useCallback } from "react";
import CurtainIntro from "./components/CurtainIntro";
import Hero from "./components/Hero";
import Utility from "./components/Utility";
import Fees from "./components/Fees";
import SiteFooter from "./components/SiteFooter";

export default function App() {
  const [introComplete, setIntroComplete] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
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

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  }, []);

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
          onAudioStart={() => setAudioStarted(true)}
          fadeThreshold={0.8}
        />
      )}

      {/* Audio Mute/Unmute Button - visible once audio starts */}
      {audioStarted && (
        <button
          onClick={toggleMute}
          className="fixed top-3 right-3 md:top-6 md:right-6 z-[200] p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all duration-200 backdrop-blur-sm"
          aria-label={isMuted ? "Unmute background music" : "Mute background music"}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
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