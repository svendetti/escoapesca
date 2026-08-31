import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initializeClientStartup } from "./lib/clientStartup";
import "./styles.css";
import "./label-alignment.css";

initializeClientStartup();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
