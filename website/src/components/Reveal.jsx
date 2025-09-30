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

    // Trigger a bit earlier and use a tiny threshold so mobile reliably fires
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.01 }
    );

    obs.observe(el);
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
