import React, { useEffect, useRef, useState } from "react";

/** ---- Tunables ---- */
const GRAVITY = 0.7;
const FRICTION = 0.9;         // linear damping
const ANGULAR_DAMP = 0.6;     // spin damping
const REQUIRED_CLICKS = 3;
const MIN_PAUSE_MS = 800;       // ~1s min
const MAX_PAUSE_MS = 1800;      // ~2s max
const THROW_SPEED_MIN = 0.25;   // px/ms
const DRAG_TRAIL_MS = 90;       // ms window to estimate throw velocity
const SOLVER_PASSES = 3;
const REST_SPEED = 0.35;

export default function PhysicsTitle({
  text,
  tvSelector = "#tv-case",
  onUnlock,
  className = "",
}) {
  const wrapRef = useRef(null);
  const overlayRef = useRef(null);

  // secret gate
  const [clickCount, setClickCount] = useState(0);
  const lastClickAtRef = useRef(0);
  const resetTimerRef = useRef(null);
  const armedRef = useRef(false);

  // physics state
  const partsRef = useRef([]);
  const draggingRef = useRef(null);
  const unlockFiredRef = useRef(false);

  /** Reset helper */
  function resetSequence(to = 0) {
    clearTimeout(resetTimerRef.current);
    setClickCount(to);
    lastClickAtRef.current = to ? performance.now() : 0;
  }

  /** Handle triple-click gate */
  const handleClick = () => {
    if (armedRef.current) return;

    // shake original label
    const el = wrapRef.current;
    if (el) {
      el.classList.remove("egg-shake");
      void el.offsetWidth;
      el.classList.add("egg-shake");
      setTimeout(() => el.classList.remove("egg-shake"), 900);
    }

    const now = performance.now();
    const prev = lastClickAtRef.current;

    if (prev === 0) {
      setClickCount(1);
      lastClickAtRef.current = now;
    } else {
      const dt = now - prev;
      if (dt >= MIN_PAUSE_MS && dt <= MAX_PAUSE_MS) {
        setClickCount((c) => c + 1);
        lastClickAtRef.current = now;
      } else {
        setClickCount(1);
        lastClickAtRef.current = now;
      }
    }

    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      if (!armedRef.current) resetSequence(0);
    }, MAX_PAUSE_MS + 120);
  };

  // Arm after 3rd valid click
  useEffect(() => {
    if (armedRef.current) return;
    if (clickCount < REQUIRED_CLICKS) return;
    armedRef.current = true;
    beginPhysics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickCount]);

  // Debug: log when egg unlock event fires
  useEffect(() => {
    const handler = (e) => {
      console.log("Egg unlocked!", e.detail);
    };
    window.addEventListener("egg:unlock", handler);
    return () => window.removeEventListener("egg:unlock", handler);
  }, []);

  /** Build overlay and bodies */
  function beginPhysics() {
    const srcWrap = wrapRef.current;
    const overlay = overlayRef.current;
    if (!srcWrap || !overlay) return;

    const spans = Array.from(srcWrap.querySelectorAll("[data-letter]"));
    const rects = spans.map((el) => el.getBoundingClientRect());
    const cs = window.getComputedStyle(srcWrap);

    // final shake on original spans
    overlay.classList.add("egg-shake");
    setTimeout(() => {
      overlay.classList.remove("egg-shake");

      // hide originals only after shake
      srcWrap.style.visibility = "hidden";

      overlay.innerHTML = "";
      partsRef.current = spans.map((srcEl, i) => {
        const r = rects[i];
        const el = document.createElement("span");
        el.textContent = srcEl.textContent;
        el.style.position = "fixed";
        el.style.left = "0";
        el.style.top = "0";
        el.style.willChange = "transform";
        el.style.pointerEvents = "auto";
        el.style.userSelect = "none";
        el.style.whiteSpace = "pre";
        // font styles
        el.style.fontFamily = cs.fontFamily;
        el.style.fontSize = cs.fontSize;
        el.style.fontWeight = cs.fontWeight;
        el.style.letterSpacing = cs.letterSpacing;
        el.style.lineHeight = cs.lineHeight;
        el.style.color = cs.color;

        overlay.appendChild(el);

        const jx = (Math.random() - 0.5) * 1.5;
        const jy = (Math.random() - 0.5) * 1.5;

        return {
          ch: srcEl.textContent,
          el,
          w: Math.max(1, r.width),
          h: Math.max(1, r.height),
          x: r.left,
          y: r.top,
          px: r.left + jx,
          py: r.top + jy,
          a: 0,
          pa: 0,
          dead: false,
          sleep: false,
        };
      });

      startLoop();
    }, 900);
  }

  /** Physics loop: Verlet + collisions + TV shelf + spin */
  function startLoop() {
    let raf;
    const step = () => {
      const bodies = partsRef.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const tv = document.querySelector(tvSelector)?.getBoundingClientRect();

      // integrate
      for (const p of bodies) {
        if (p.dead) continue;
        if (draggingRef.current?.p === p || p.sleep) continue;

        const vx = (p.x - p.px) * FRICTION;
        const vy = (p.y - p.py) * FRICTION + GRAVITY;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy;

        const av = (p.a - p.pa) * ANGULAR_DAMP;
        p.pa = p.a;
        p.a += av;
      }

      // constraints
      for (let pass = 0; pass < SOLVER_PASSES; pass++) {
        // TV shelf
        if (tv) {
          for (const p of bodies) {
            if (p.dead) continue;
            const prevBottom = p.py + p.h;
            const bottom = p.y + p.h;
            const cx = p.x + p.w / 2;
            const SHELF_OFFSET = 20;
            const shelfY = tv.top + SHELF_OFFSET;
            const crossingTop = bottom >= shelfY && prevBottom <= shelfY + 8;
            if (cx > tv.left && cx < tv.right && crossingTop) {
              p.y = shelfY - p.h;
              p.py = p.y;
              const vx = p.x - p.px;
              p.a += vx * 0.01;
            }
          }
        }

        // inter-letter collisions
        for (let i = 0; i < bodies.length; i++) {
          const a = bodies[i];
          if (a.dead) continue;
          for (let j = i + 1; j < bodies.length; j++) {
            const b = bodies[j];
            if (b.dead) continue;

            const ax2 = a.x + a.w, ay2 = a.y + a.h;
            const bx2 = b.x + b.w, by2 = b.y + b.h;
            const overlapX = Math.min(ax2, bx2) - Math.max(a.x, b.x);
            const overlapY = Math.min(ay2, by2) - Math.max(a.y, b.y);
            if (overlapX > 0 && overlapY > 0) {
              if (overlapX < overlapY) {
                const dir = (a.x + a.w / 2) < (b.x + b.w / 2) ? -1 : 1;
                const push = (overlapX / 2) * dir;
                a.x += push; b.x -= push;
                const avx = (a.y - a.py) - (b.y - b.py);
                a.a += avx * 0.01 * -dir;
                b.a += avx * 0.01 * dir;
              } else {
                const dir = (a.y + a.h / 2) < (b.y + b.h / 2) ? -1 : 1;
                const push = (overlapY / 2) * dir;
                a.y += push; b.y -= push;
                const sl = (a.x - a.px) - (b.x - b.px);
                a.a += sl * 0.01 * dir;
                b.a -= sl * 0.01 * dir;
              }
            }
          }
        }
      }

      // culling + sync
      let alive = 0;
      for (const p of bodies) {
        if (p.dead) continue;
        if (p.x + p.w < 0 || p.x > W || p.y + p.h < 0 || p.y > H) {
          p.dead = true;
          p.el.style.opacity = "0";
          continue;
        }
        p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.a}rad)`;
        alive++;
      }

      if (alive) {
        maybeUnlock(tv);
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
  }

  /** Drag/toss */
  useEffect(() => {
    function hitTest(x, y) {
      return partsRef.current.find(
        (p) => !p.dead && x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h
      );
    }

    const onDown = (e) => {
      if (!armedRef.current) return;
      const p = hitTest(e.clientX, e.clientY);
      if (!p) return;
      p.sleep = true;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      draggingRef.current = { p, dx, dy, samples: [{ t: performance.now(), x: p.x, y: p.y }] };
      e.preventDefault();
    };

    const onMove = (e) => {
      const d = draggingRef.current;
      if (!d) return;
      const { p, dx, dy, samples } = d;
      const nx = e.clientX - dx;
      const ny = e.clientY - dy;
      p.a += (nx - p.x) * 0.004;
      p.x = nx; p.y = ny;
      const now = performance.now();
      samples.push({ t: now, x: nx, y: ny });
      while (samples.length && now - samples[0].t > DRAG_TRAIL_MS) samples.shift();
    };

    const onUp = () => {
      const d = draggingRef.current;
      if (!d) return;
      const { p, samples } = d;
      const now = performance.now();
      const anchor =
        samples.find((s) => now - s.t >= Math.min(DRAG_TRAIL_MS * 0.6, DRAG_TRAIL_MS)) ||
        samples[0];
      const dt = Math.max(1, now - anchor.t);
      const dx = p.x - anchor.x;
      const dy = p.y - anchor.y;
      const speed = Math.hypot(dx, dy) / dt;

      p.sleep = false;
      if (speed >= THROW_SPEED_MIN) {
        const impulseMs = 16;
        p.px = p.x - (dx / dt) * impulseMs;
        p.py = p.y - (dy / dt) * impulseMs;
        p.pa = p.a - (dx / dt) * 0.2;
      } else {
        p.px = p.x;
        p.py = p.y - 1;
        p.pa = p.a;
        const tv = document.querySelector(tvSelector)?.getBoundingClientRect();
        if (tv) {
          const cx = p.x + p.w / 2;
          const overTop = p.y + p.h >= tv.top - 6 && p.y + p.h <= tv.top + 12;
          if (cx > tv.left && cx < tv.right && overTop) {
            p.y = tv.top - p.h;
            p.py = p.y;
            p.sleep = true;
          }
        }
      }
      draggingRef.current = null;
    };

    window.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [tvSelector]);

  /** Unlock on TRT */
  function maybeUnlock(tv) {
    if (unlockFiredRef.current || !tv) return;
    const live = partsRef.current.filter((p) => !p.dead);
    if (live.length !== 3) return;
    const chars = live.map((p) => p.ch).sort().join("");
    if (chars !== "RTT") return;
    const ok = live.every((p) => {
      const cx = p.x + p.w / 2;
      const onTop = Math.abs(p.y + p.h - tv.top) <= 8;
      const inside = cx > tv.left && cx < tv.right;
      const speed = Math.hypot(p.x - p.px, p.y - p.py);
      return onTop && inside && (p.sleep || speed < REST_SPEED);
    });
    if (ok) {
      unlockFiredRef.current = true;
      window.dispatchEvent(new CustomEvent("egg:unlock", { detail: { key: "TRT" } }));
      if (onUnlock) onUnlock();
    }
  }

  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  return (
    <div className={`relative inline-block ${className}`} onClick={handleClick}>
      <div ref={wrapRef} className="select-none">
        {text.split("").map((ch, i) => (
          <span key={i} data-letter>{ch === " " ? "\u00A0" : ch}</span>
        ))}
      </div>
      <div
        ref={overlayRef}
        className="fixed left-0 top-0 w-screen h-screen pointer-events-none z-[60]"
        style={{ contain: "layout paint style" }}
      />
    </div>
  );
}
