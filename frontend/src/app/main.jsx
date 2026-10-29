import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import Providers from "./providers.jsx";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary.jsx";

// OpenTelemetry (and its zone.js dependency) is only downloaded when enabled.
if (import.meta.env.VITE_ENABLE_OBSERVABILITY === "true") {
  import("../tracing");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Providers>
          <App />
        </Providers>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
