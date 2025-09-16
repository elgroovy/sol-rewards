import React, { useEffect, useMemo, useRef } from "react";

// --- Particle field background ---
function useParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0, height = 0;

    const setSize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const cssW = Math.round(rect.width);
      const cssH = Math.round(rect.height);
      if (cssW === width && cssH === height) return;
      width = cssW;
      height = cssH;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    setSize();

    const particles = Array.from({ length: 200 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.6,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      c: Math.random(),
    }));

    let raf;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const grad = ctx.createRadialGradient(width/2, height/2, Math.min(width, height)/3, width/2, height/2, Math.max(width, height));
      grad.addColorStop(0, "rgba(7,11,22,0.0)");
      grad.addColorStop(1, "rgba(7,11,22,0.55)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;

        ctx.beginPath();
        const hue = 190 + p.c * 160;
        ctx.fillStyle = `hsla(${hue}, 100%, 65%, 0.9)`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(render);
    };
    render();

    window.addEventListener("resize", setSize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setSize);
    };
  }, []);

  return canvasRef;
}

// --- Animated glitchy headline ---
const GlitchTitle = ({ text }) => {
  const letters = useMemo(() => text.split(""), [text]);
  return (
    <div className="select-none">
      <h1 className="relative text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-wide text-white">
        {letters.map((ch, i) => (
          <span
            key={i}
            className="inline-block glitch-letter"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            {ch === ' ' ? '\u00A0' : ch}
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
};

// --- Small helper: Section container ---
const Section = ({ id, children, className = "" }) => (
  <section id={id} className={`relative w-full ${className}`}>
    {children}
  </section>
);

// --- Main page ---
export default function TRTWebsite() {
  const canvasRef = useParticleField();

  const testGif = "test_signal_anim.gif";
  const noSignalGif = "no_signal_anim.gif";

  return (
    <div className="min-h-screen w-full bg-[#070B16] text-white overflow-x-hidden font-sans">
      {/* HERO */}
      <Section id="hero" className="min-h-[92vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <canvas ref={canvasRef}/>
        </div>

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          {/* Top animation (centered, 320x320, soft edge blend) */}
          <div className="flex justify-center mb-4">
            <video
              src="smiley_face_anim.mp4"
              autoPlay
              loop
              muted
              playsInline
              width={320}
              height={320}
              className="w-[320px] h-[320px]"
                style={{
                  objectFit: "cover",
                  WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  WebkitMaskSize: "cover",
                  maskImage: "radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  maskSize: "cover",
                }}
            />
          </div>
          <div className="mb-5 text-xs uppercase tracking-[0.35em] text-cyan-300/80">Solana Token — $TRT</div>
          <GlitchTitle text="TEST REWARDS TOKEN" />
          <p className="mt-5 text-lg md:text-xl text-white/80 leading-relaxed">
            It started as a test, but it ended up being the best reward token on Solana.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="#buy" className="rounded-2xl px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 active:bg-fuchsia-700 transition font-semibold">BUY ON JUPITER</a>
            <a href="#join" className="rounded-2xl px-6 py-3 border border-cyan-400 hover:border-cyan-300 bg-white/0 hover:bg-cyan-400/10 transition font-medium">JOIN ✦</a>
          </div>
        </div>
      </Section>

      {/* UTILITY */}
      <Section id="utility" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl md:text-4xl font-bold mb-8">Hold & Win <span className="text-cyan-300">Rewards</span></h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[{t:"Buy $TRT", d:"Load SOL and swap on any DEX."}, {t:"Daily Rewards", d:"Holders receive reflections automatically."}, {t:"Win Jackpots", d:"Jackpot rounds for holders."}].map((c, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:shadow-lg transition">
                <div className="text-xl font-semibold mb-2">{c.t}</div>
                <div className="text-white/75">{c.d}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* FEE STRUCTURE */}
      <Section id="fees" className="py-20">
        <div className="absolute inset-0 -z-10 opacity-15" style={{backgroundImage: `url(${noSignalGif})`, backgroundSize: 'cover', backgroundPosition: 'center'}}></div>
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-wide">FEE STRUCTURE</h2>
          <p className="mt-2 text-white/70">10% TAX (BUY / SELL / TRANSFER)</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {p:"7%", l:"Holders", s:"Rewards"},
              {p:"2%", l:"Treasury", s:""},
              {p:"1%", l:"Lottery", s:"Jackpots"},
            ].map((box, i) => (
              <div key={i} className="rounded-2xl p-6 border border-white/10 bg-gradient-to-br from-fuchsia-600/10 via-cyan-400/10 to-transparent hover:from-fuchsia-600/20 hover:via-cyan-400/20 transition">
                <div className="text-5xl font-extrabold mb-2">{box.p}</div>
                <div className="text-lg font-semibold">{box.l}</div>
                {box.s && <div className="text-white/70">{box.s}</div>}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="relative py-12 text-center text-white/60">
        <div className="text-xs tracking-wider">
          © {new Date().getFullYear()} $TRT — Test Rewards Token
        </div>
        <div className="mt-2 text-[10px] opacity-70">NO SIGNAL</div>
        <div className="mt-6 flex justify-center">
          <img
            src={testGif}
            alt="test-signal"
            className="max-w-full h-auto w-[200px] rounded opacity-80"
          />
        </div>
      </footer>
    </div>
  );
}
