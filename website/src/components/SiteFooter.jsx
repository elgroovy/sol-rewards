import React from "react";

export default function SiteFooter() {
  return (
    // Footer wrapper
    <footer className="relative pt-4 pb-10 text-center text-white/60">
      {/* Copyright */}
      <div className="text-xs tracking-wider">
        © {new Date().getFullYear()} $TRT — Test Rewards Token
      </div>
      {/* Status line */}
      <div className="mt-2 text-[10px] opacity-70">NO SIGNAL</div>
    </footer>
  );
}
