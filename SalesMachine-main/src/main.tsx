
import { createRoot } from "react-dom/client";
import App from "./App";
import { SalesProvider } from "./contexts/SalesContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <SalesProvider>
    <App />
  </SalesProvider>
);
  
