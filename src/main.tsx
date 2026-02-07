import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Simplified initialization for debugging
console.log('Tax Hub Admin starting...');

try {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }
  
  createRoot(root).render(<App />);
  console.log('App rendered successfully');
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace;">
      <h1>Application Error</h1>
      <pre>${error}</pre>
    </div>
  `;
}
