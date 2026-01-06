import React from "react";

export default function SiteFooter() {
  return (
    // Footer wrapper
    <footer className="relative pt-4 pb-4 text-center text-white/60">
      {/* TRT Logo */}
      <div className="flex justify-center mb-4 flicker-effect">
        <div className="relative overflow-hidden noise-effect">
          <img src="/trt-logo.png" alt="TRT Logo" className="h-28" />
        </div>
      </div>
      {/* Copyright */}
      <div className="text-xs tracking-wider flicker-effect">
              <span className="noise-effect-inline">© {new Date().getFullYear()} $TRT — Test Rewards Token</span>
      </div>
      {/* Status line */}
      <div className="mt-2 text-[10px] opacity-70 flicker-effect">
              <span className="noise-effect-inline">NO SIGNAL</span>
      </div>
      {/* Support */}
      <div className="mt-6 text-xs tracking-wide opacity-70 flicker-effect">
        <span className="noise-effect-inline">
          Support:&nbsp;
          <a
            href="mailto:admin@testrewardstoken.com"
            className="
              bg-gradient-to-r from-cyan-300 to-fuchsia-400
              bg-clip-text text-transparent
              hover:from-cyan-200 hover:to-fuchsia-300
              transition-all
            "
          >
            admin@testrewardstoken.com
          </a>
        </span>
      </div>
    </footer>
  );
}
