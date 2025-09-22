import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Animated contract address that assembles from screen edges.
 * - No external libs
 * - Retrigger on click
 * - Respects prefers-reduced-motion
 */
export default function AssemblingCA({
  value,
  fontSize = 18,              // px
  gap = 0,                    // px between letters
  duration = 900,             // ms per letter
  stagger = 25,               // ms between letters
  paddingX = 20,              // pill padding left/right
  paddingY = 12,              // pill padding top/bottom
}) {
  const wrapRef = useRef(null);
  const measureRef = useRef([]);
  const [pieces, setPieces] = useState([]);
  const [go, setGo] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotateActive, setRotateActive] = useState(false);
  const toastTimerRef = useRef(null);
  const rotateTimerRef = useRef(null);

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setCopied(false), 1600);
      setRotateActive(true);
      clearTimeout(rotateTimerRef.current);
      rotateTimerRef.current = setTimeout(() => setRotateActive(false), 1000); // Animation duration
    } catch (_) {
      // if copy fails, still show a small toast to indicate action
      setCopied(true);
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setCopied(false), 1600);
      setRotateActive(true);
      clearTimeout(rotateTimerRef.current);
      rotateTimerRef.current = setTimeout(() => setRotateActive(false), 1000); // Animation duration
    }
  };

  const chars = useMemo(() => value.split(""), [value]);

  // pre-generate random start positions from around the viewport edges
  const edges = useMemo(() => {
    const vw = Math.max(800, window.innerWidth || 800);
    const vh = Math.max(600, window.innerHeight || 600);
    return chars.map(() => {
      const side = Math.floor(Math.random() * 4); // 0 top,1 right,2 bottom,3 left
      const spreadX = Math.random() * vw;
      const spreadY = Math.random() * vh;
      if (side === 0) return { x: spreadX - vw * 0.5, y: -vh * 0.6 };          // top
      if (side === 1) return { x: vw * 0.6,           y: spreadY - vh * 0.5 }; // right
      if (side === 2) return { x: spreadX - vw * 0.5, y: vh * 0.6 };           // bottom
      return { x: -vw * 0.6, y: spreadY - vh * 0.5 };                          // left
    });
    // eslint-disable-next-line
  }, [value]);

  // Layout: measure final letter positions
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wrap = wrapRef.current;
    if (!wrap) return;

    // positions relative to wrapper center
    const wrapBox = wrap.getBoundingClientRect();
    const targets = measureRef.current.map((el) => {
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return {
        x: (r.left - wrapBox.left) + r.width / 2 - wrapBox.width / 2,
        y: (r.top - wrapBox.top) + r.height / 2 - wrapBox.height / 2,
      };
    });

    const next = chars.map((ch, i) => ({
      ch,
      x0: edges[i].x,
      y0: edges[i].y,
      x1: targets[i].x,
      y1: targets[i].y,
      delay: i * stagger,
    }));
    
    setPieces(next);

   // schedule play + completion
   if (!media.matches) {
     setDone(false);
     setGo(false);
     // kick off on the next (next) frame so CSS transitions fire
     requestAnimationFrame(() => {
       requestAnimationFrame(() => setGo(true));
     });
     // mark finished after last letter’s stagger + duration
     const total = duration + stagger * (chars.length - 1) + 200;
     const timer = setTimeout(() => setDone(true), total);
     return () => {
       clearTimeout(timer);
       setGo(false);
       setDone(false);
     };
    } else {
      // reduced motion: show the assembled text immediately
      setGo(false);
      setDone(true);
      return () => {
        setGo(false);
        setDone(false);
      };
    }
  }, [chars, edges, stagger]);

  return (
    <div className="w-full flex justify-center">
      <div
        ref={wrapRef}
        className="relative outline-none group"
        style={{
          padding: `${paddingY}px ${paddingX}px`,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px) saturate(140%)",
          WebkitBackdropFilter: "blur(10px) saturate(140%)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.25)",
        }}
        // Click: copy + allow re-play on Alt/Option click
        onClick={(e) => {
          if (e.altKey) {
            setGo(false);
            requestAnimationFrame(() => setGo(true));
          } else {
            copyToClipboard();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Contract address. Click to copy."
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            copyToClipboard();
          }
        }}
       >
        {/* Toast */}
      <div
        aria-live="polite"
        className={`pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg text-sm font-medium
                    bg-white/15 backdrop-blur-md border border-white/20 shadow-lg
                    transition-opacity duration-300 ${copied ? "opacity-100" : "opacity-0"}`}
      >
        Copied!
      </div>
      
        {/* 1) Actual text (static) */}
        <div
          className="font-extrabold tracking-wide text-white select-text"
          style={{
            fontSize,
            letterSpacing: "0",
            lineHeight: 1.2,
            // only reveal after the animation has finished
            visibility: done ? "visible" : "hidden",
            whiteSpace: "nowrap",
            fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
          }}
        >
          {chars.map((ch, i) => (
            <span
              key={`m-${i}`}
              ref={(el) => (measureRef.current[i] = el)}
              className={rotateActive ? "rotate-letter" : ""}
              style={{
                marginRight: i < chars.length - 1 ? gap : 0,
                animationDelay: rotateActive ? `${i * 0.005}s` : "0s",
                display: "inline-block", // Ensure transform applies
              }}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* 2) Flying letters (absolute) */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,.35))" }}
        >
          {pieces.map((p, i) => (
            <span
              key={`f-${i}`}
              className="absolute"
              style={{
                fontSize,
                fontWeight: 800,
                letterSpacing: "0",
                color: "white",
                transform: `translate(${go ? p.x1 : p.x0}px, ${go ? p.y1 : p.y0}px)`,
                transition: `transform ${duration}ms cubic-bezier(.2,.8,.2,1) ${p.delay}ms, opacity ${duration}ms ${p.delay}ms`,
                opacity: done ? 0 : (go ? 1 : 0),
              }}
            >
              {p.ch}
            </span>
          ))}
        </div>

        <style>{`
          @keyframes rotate-360 {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .rotate-letter {
            animation: rotate-360 0.5s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
}
