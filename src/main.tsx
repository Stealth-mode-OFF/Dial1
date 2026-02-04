
import { createRoot } from "react-dom/client";
import App from "./App";
import { SalesProvider } from "./contexts/SalesContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { checkEnvironment } from "./utils/env";
import "./dialer.css";
import "./meetcoach.css";
import "./styles/production.css";

// Validate environment on startup
checkEnvironment();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <SalesProvider>
      <App />
    </SalesProvider>
  </ErrorBoundary>
);
