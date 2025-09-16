import React from "react";

export default function SiteFooter() {
  return (
    <footer className="relative py-12 text-center text-white/60">
      <div className="mt-6 flex justify-center">
        <img
          src="/test_signal_anim.gif"
          alt="test-signal"
          className="max-w-full h-auto w-[300px] rounded opacity-80"
        />
      </div>
      <div className="text-xs tracking-wider">
        © {new Date().getFullYear()} $TRT — Test Rewards Token
      </div>
      <div className="mt-2 text-[10px] opacity-70">NO SIGNAL</div>
    </footer>
  );
}
