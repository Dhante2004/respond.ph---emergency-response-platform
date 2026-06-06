import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

//  Register Service Worker in production so Chrome can enable install prompt
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      // optional debug
      // console.log("SW registered:", reg.scope);
    } catch (err) {
      console.error("SW registration failed:", err);
    }
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Could not find root element to mount to");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
