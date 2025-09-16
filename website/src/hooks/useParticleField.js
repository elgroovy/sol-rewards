import { useEffect, useRef } from "react";

export default function useParticleField() {
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
      width = cssW; height = cssH;
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
      const grad = ctx.createRadialGradient(
        width/2, height/2, Math.min(width, height)/3,
        width/2, height/2, Math.max(width, height)
      );
      grad.addColorStop(0, "rgba(7,11,22,0.0)");
      grad.addColorStop(1, "rgba(7,11,22,0.55)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
        ctx.beginPath();
        const hue = 190 + p.c * 160;
        ctx.fillStyle = `hsla(${hue},100%,65%,0.9)`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
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
