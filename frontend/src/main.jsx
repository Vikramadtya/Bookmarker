import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import Providers from "./providers.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

// Synchronously capture token from URL before React boots up
if (typeof window !== "undefined") {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");
  if (token) {
    localStorage.setItem("bookmarker_token", token);
    url.searchParams.delete("token");
    window.history.replaceState({}, document.title, url.toString());
  }
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
