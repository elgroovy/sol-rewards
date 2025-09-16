import React from "react";
import { createRoot } from "react-dom/client";
import TRTWebsite from "./website.jsx"; // adjust the path if needed

// Mount into the <div id="root"></div> in public/index.html
const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <TRTWebsite />
  </React.StrictMode>
);
