import { useEffect, useRef } from "react";

/**
 * Simple 2D starfield (no parallax) + rare meteor.
 * - Keeps the original lightweight dots drifting slowly.
 * - Adds a shooting star every few seconds.
 */
export default function useParticleField() {
  const canvasRef = useRef(null);
  const scrollFactorRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Full-bleed canvas inside the section
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    // Scroll factor for color desaturation
    const updateScrollFactor = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollY = window.scrollY;
      const factor = docHeight > 0 ? scrollY / docHeight : 0;
      scrollFactorRef.current = Math.min(Math.max(factor, 0), 1);
    };
    window.addEventListener("scroll", updateScrollFactor);
    updateScrollFactor(); // initialize

    // DPR & sizing
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0, height = 0;
    const setSize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const cssW = Math.round(rect.width);
      const cssH = Math.round(rect.height);
      if (cssW === width && cssH === height) return;
      width = cssW; height = cssH;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    setSize();

    // Drifting dots
    const N = 100;
    const particles = Array.from({ length: N }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.6,
      vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05,
      c: Math.random(), // hue seed
    }));

    // Meteor (shooting star)
    const rnd = (a, b) => a + Math.random() * (b - a);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const meteor = { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, ttl: 0 };

    const spawnMeteor = () => {
      if (meteor.active || reduceMotion) return;
      meteor.active = true;
      meteor.x = Math.random() * width * 0.5; // start towards left half
      meteor.y = -20;
      const speed = rnd(0.9, 1.6);
      const angle = rnd(Math.PI * 0.15, Math.PI * 0.30); // down-right
      meteor.vx = Math.cos(angle) * speed;
      meteor.vy = Math.sin(angle) * speed;
      meteor.life = 0;
      meteor.ttl = rnd(900, 1400); // ms
    };

    let nextMeteor = setTimeout(spawnMeteor, rnd(2000, 6000));

    // Render loop
    let raf;
    let last = performance.now();
    const render = (t) => {
      const dt = Math.min(32, t - last); // clamp delta (ms)
      last = t;

      // Background vignette
      ctx.clearRect(0, 0, width, height);
      const grad = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) / 3,
        width / 2, height / 2, Math.max(width, height)
      );
      grad.addColorStop(0, "rgba(7,11,22,0.0)");
      grad.addColorStop(1, "rgba(7,11,22,0.55)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Stars (simple drift + wrap)
      particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -2) p.x = width + 2; if (p.x > width + 2) p.x = -2;
        if (p.y < -2) p.y = height + 2; if (p.y > height + 2) p.y = -2;

        ctx.beginPath();
        const hue = 190 + p.c * 160;
        const sat = (1 - scrollFactorRef.current) * 100;
        ctx.fillStyle = `hsla(${hue},${sat}%,65%,0.9)`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Meteor drawing
      if (meteor.active) {
        meteor.life += dt;
        meteor.x += meteor.vx * dt;
        meteor.y += meteor.vy * dt;

        const p = Math.min(1, meteor.life / meteor.ttl);
        const alpha = 1 - p;
        const len = 160;

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);

        const angle = Math.atan2(meteor.vy, meteor.vx);
        const tx = Math.cos(angle), ty = Math.sin(angle);

        // trail
        const trail = ctx.createLinearGradient(
          meteor.x, meteor.y,
          meteor.x - tx * len, meteor.y - ty * len
        );
        trail.addColorStop(0, "rgba(255,255,255,0.9)");
        trail.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = trail;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(meteor.x - tx * 4, meteor.y - ty * 4);
        ctx.lineTo(meteor.x - tx * len, meteor.y - ty * len);
        ctx.stroke();

        // head
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.shadowColor = "rgba(180,220,255,0.9)";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(meteor.x, meteor.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // end of life → schedule next meteor
        if (meteor.life >= meteor.ttl || meteor.y > height + 50) {
          meteor.active = false;
          clearTimeout(nextMeteor);
          nextMeteor = setTimeout(spawnMeteor, rnd(4000, 8000));
        }
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    // Resize & cleanup
    const onResize = () => setSize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", updateScrollFactor);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      clearTimeout(nextMeteor);
    };
  }, []);

  return canvasRef;
}
