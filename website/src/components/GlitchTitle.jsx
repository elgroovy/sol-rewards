import React, { useMemo } from "react";

export default function GlitchTitle({ text }) {
  const letters = useMemo(() => text.split(""), [text]);
  return (
    <div className="select-none">
      <h1 className="relative text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-wide text-white">
        {letters.map((ch, i) => (
          <span key={i} className="inline-block glitch-letter" style={{ animationDelay: `${i * 0.1}s` }}>
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </h1>
      <style>{`
        @keyframes hueShift { 0%{filter:hue-rotate(0deg)} 50%{filter:hue-rotate(180deg)} 100%{filter:hue-rotate(360deg)} }
        @keyframes flicker { 0%,95%,100%{opacity:1} 96%{opacity:0.5} 97%{opacity:0.2} 98%{opacity:0.7} 99%{opacity:0.4} }
        .glitch-letter {
          text-shadow: 0 0 8px rgba(0,255,255,.6), 0 0 14px rgba(255,0,255,.5);
          animation: flicker 3s infinite, hueShift 6s infinite linear;
        }
      `}</style>
    </div>
  );
}
