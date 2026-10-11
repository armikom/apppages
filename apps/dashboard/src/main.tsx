import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { installGlobalErrorHandlers, createLogger } from "./lib/logger";
import "./index.css";

const log = createLogger("main");

installGlobalErrorHandlers();
log.info("AppPages dashboard initializing", {
  env: import.meta.env.MODE,
  emulators: import.meta.env.VITE_USE_EMULATORS === "true",
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

log.info("React app mounted");
