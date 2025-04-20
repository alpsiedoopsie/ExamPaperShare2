// This file is used to register the service worker in the application

// Register service worker
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
}

// Check for service worker updates
export function checkForServiceWorkerUpdates() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.update();
    });
  }
}

// Unregister service worker
export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.unregister();
    });
  }
}

// Notify user about new content available
export function setupUpdateNotifications(callback: () => void) {
  if ('serviceWorker' in navigator) {
    // When the service worker has updated and is waiting to be activated,
    // we show a notification to the user
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      callback();
    });
  }
}
