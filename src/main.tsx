import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { measureWebVitals } from "./lib/performance";
import { startHealthMonitoring } from "./lib/health";
import logger from "./lib/logger";
import config from "./config";

// Initialize performance monitoring
if (config.features.performanceMonitoring) {
  measureWebVitals();
  startHealthMonitoring(60000); // Check every minute
}

// Log app initialization
logger.info('Tax Hub Admin starting', {
  version: config.app.version,
  environment: config.app.environment,
});

createRoot(document.getElementById("root")!).render(<App />);
