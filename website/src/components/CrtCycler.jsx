import React, { useEffect, useRef, useState } from "react";

/**
 * A single CRT-like card that cycles through items.
 * - Shows "static" (no signal) between items.
 * - Randomized on/off windows for a more organic feel.
 * - Respects prefers-reduced-motion.
 *
 * items: [{ p: "7%", l: "Holders", s: "Rewards" }, ...]
 */
// make sure you have: import React, { useEffect, useRef, useState } from "react";

export default function CrtCycler({
  items,
  fill = false,
  frameless = true,
  width = 880,     // px at lg screens (responsive via tailwind classes below)
  minOn = 1400,    // ms signal visible
  maxOn = 2400,
  minOff = 600,    // ms static only
  maxOff = 1400,
  ...props         // <-- rest MUST be last
}) {
  const [i, setI] = useState(0);           // which item
  const [phase, setPhase] = useState("intro"); // "intro" | "static" | "signal"
  const firstRunRef = useRef(true);        // track whether we've completed the first cycle
  const [assetsReady, setAssetsReady] = useState(false);
  const tRef = useRef(null);

  // random helper
  const rnd = (a, b) => Math.round(a + Math.random() * (b - a));

  // Preload animations so intro actually shows on first mount
  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    const done = () => { if (!cancelled && ++loaded >= 1) setAssetsReady(true); };
    const a = new Image(); a.onload = done; a.src = "/test_signal_anim.gif";
    const b = new Image(); b.onload = done; b.src = "/no_signal_anim.gif";
    // Fallback in case onload doesn't fire promptly (cache/CDN quirk)
    const fallback = setTimeout(done, 500);
    return () => { cancelled = true; clearTimeout(fallback); };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cancelled = false;

    function cycle(nextIndex) {
      const playStaticThenSignal = () => {
        // 1) static noise
        setPhase("static");
        tRef.current = setTimeout(() => {
          if (cancelled) return;
          // 2) show signal (text) for current item
          setI(nextIndex);
          setPhase("signal");
          tRef.current = setTimeout(() => {
            if (cancelled) return;
            // 3) advance to next item
            cycle((nextIndex + 1) % items.length);
          }, media.matches ? 1 : rnd(minOn, maxOn));
        }, media.matches ? 1 : rnd(minOff, maxOff));
      };

      // When we wrap back to the first item (and it's not the very first run),
      // play the intro test-signal again before static+signal.
      if (!firstRunRef.current && nextIndex === 0) {
        setPhase("intro");
        tRef.current = setTimeout(playStaticThenSignal, media.matches ? 1 : 2100);
      } else {
        playStaticThenSignal();
      }

      firstRunRef.current = false;
    }

    // play intro once, then loop
    if (!assetsReady) return;
    setPhase("intro");
    tRef.current = setTimeout(() => cycle(0), media.matches ? 1 : 2100); // a bit longer to ensure visibility
    return () => { cancelled = true; clearTimeout(tRef.current); };
  }, [assetsReady, items, minOn, maxOn, minOff, maxOff]);

  const cur = items[i];

  return (
    <div
      className={
        "relative " +
        (frameless
          ? "w-full h-full overflow-hidden bg-transparent" // for use behind the PNG frame
          : "overflow-hidden rounded-[28px] border border-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,.06),0_30px_80px_rgba(0,0,0,.35)] bg-[#0c1222] " +
            (fill ? "w-full h-full" : "w-full max-w-[92vw] md:max-w-[720px] lg:max-w-[880px] aspect-[16/7]"))
      }
      style={{
        // subtle curved-glass highlight
        backgroundImage:
          "radial-gradient(120% 160% at 50% -10%, rgba(255,255,255,.08) 0%, rgba(255,255,255,0) 45%)",
        backdropFilter: "blur(6px) saturate(130%)",
        WebkitBackdropFilter: "blur(6px) saturate(130%)",
      }}
    >
      {/* Intro test-signal */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          phase === "intro" ? "opacity-100" : "opacity-0"
        }`}
        style={{
          zIndex: 3,
          backgroundImage: 'url("/test_signal_anim.gif")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      />

      {/* Static/no-signal layer */}
      <div
        className={`absolute inset-0 transition-opacity duration-400 ease-out ${
          phase === "static" ? "opacity-100" : "opacity-0"
        }`}
        style={{
          zIndex: 2,
          backgroundImage: 'url("/no_signal_anim.gif")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "contrast(1.05) brightness(.9) saturate(1.1)",
        }}
        aria-hidden
      />

      {/* Scanlines + vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 4,
          background:
            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, rgba(0,0,0,0) 2px)",
          mixBlendMode: "overlay",
          opacity: 0.25,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 4,
          background:
            "radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,.45) 100%)",
        }}
        aria-hidden
      />

      {/* Content (signal on) */}
      <div
        className={`absolute inset-0 grid place-items-center transition-opacity duration-300 ${
          phase === "signal" ? "opacity-100" : "opacity-0"
        }`}
        style={{ zIndex: 5 }}
      >
        <div className="text-center px-8">
          <div
            className="text-6xl md:text-7xl font-extrabold tracking-wide"
            style={{
              textShadow:
                "0 0 10px rgba(0,255,255,.45), 0 0 18px rgba(255,0,255,.35)",
            }}
          >
            {cur.p}
          </div>
          <div className="mt-2 text-xl md:text-2xl font-semibold">
            {cur.l}
          </div>
          {cur.s ? (
            <div className="mt-1 text-white/75">{cur.s}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
