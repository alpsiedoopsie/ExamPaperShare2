import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, checkForServiceWorkerUpdates, setupUpdateNotifications } from "./service-worker";

// Register service worker
registerServiceWorker();

// Check for updates periodically
setInterval(() => {
  checkForServiceWorkerUpdates();
}, 60 * 60 * 1000); // Check every hour

// Setup notification for when updates are available
setupUpdateNotifications(() => {
  console.log("New content is available; please refresh the page.");
  
  // Show alert notification for update - we'll use a simple approach that works in all browsers
  if (window.confirm("A new version of the app is available. Would you like to reload to update?")) {
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
