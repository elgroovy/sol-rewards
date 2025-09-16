import React from "react";
import Hero from "./components/Hero";
import Utility from "./components/Utility";
import Fees from "./components/Fees";
import SiteFooter from "./components/SiteFooter";

export default function App() {
  return (
    <div className="min-h-screen w-full bg-[#070B16] text-white overflow-x-hidden font-sans">
      <Hero />
      <Utility />
      <Fees />
      <SiteFooter />
    </div>
  );
}
