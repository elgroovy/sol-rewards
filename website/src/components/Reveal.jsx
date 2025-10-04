import React, { useEffect, useRef, useState } from "react";

/**
 * Fades & slides content in when it enters the viewport.
 * - Respects prefers-reduced-motion (shows immediately).
 * - Use `delay` to stagger siblings.
 * - Use `as` to change wrapper element.
 */
export default function Reveal({
  as: Tag = "div",
  children,
  className = "",
  delay = 0,
  once = true,
  direction = "up",
}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Accessibility: no animations if user prefers reduced motion
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);       // or your state setter name
          io.disconnect();      // play once
        }
      },
      // Fire as soon as any pixel is visible; no negative margins
      { root: null, rootMargin: "0px", threshold: 0 }
    );

    io.observe(el);
    // If already visible when mounted, reveal immediately
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0) {
      setInView(true);
      io.disconnect();
    }
    return () => obs.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      className={`transition-all duration-[800ms] ease-out will-change-[opacity,transform] ${
        inView
          ? "opacity-100 translate-y-0 translate-x-0"
          : `opacity-0 ${
              direction === "left"
                ? "-translate-x-10"
                : direction === "right"
                ? "translate-x-10"
                : "translate-y-6"
            }`
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
