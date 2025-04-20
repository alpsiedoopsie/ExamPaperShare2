// Service Worker for ExamShare Application
const CACHE_NAME = 'examshare-cache-v1';

// Assets and routes to cache
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/auth'
];

// API routes that should not be cached
const API_ROUTES = ['/api/'];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker caching static assets');
        return cache.addAll(CACHE_ASSETS);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  
  // Claim clients to ensure the service worker takes control immediately
  event.waitUntil(self.clients.claim());
  
  // Clean up old cache versions
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: clearing old cache -', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Helper function to determine if a request is an API call
function isApiRequest(url) {
  return API_ROUTES.some(route => url.pathname.startsWith(route));
}

// Helper function to determine if a request is a static asset
function isStaticAsset(url) {
  const fileExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.json', '.woff', '.woff2', '.ttf'];
  return fileExtensions.some(ext => url.pathname.endsWith(ext));
}

// Fetch event - network first for API requests, cache first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // For API requests: Network first, then fail
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request)
        .catch((error) => {
          console.log('Service Worker: API fetch failed, returning offline response', error);
          
          // If the API request fails and we're offline, return a custom response
          return new Response(
            JSON.stringify({ error: 'You are offline. Please try again when you have an internet connection.' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }
  
  // For static assets: Cache first, then network
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If not in cache, fetch from network and cache
          return fetch(event.request)
            .then((response) => {
              // Clone the response as it can only be consumed once
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            });
        })
    );
    return;
  }
  
  // For HTML navigation requests: Network first, then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // If not in cache, fall back to the index.html for SPA
              return caches.match('/index.html');
            });
        })
    );
    return;
  }
  
  // Default strategy: Cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request);
      })
  );
});

// Listen for push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }
  
  const notification = event.data.json();
  const options = {
    body: notification.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: notification.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(notification.title, options)
  );
});

// Listen for notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientsList) => {
        // If a window client is already open, focus it
        for (const client of clientsList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});

// Background sync for offline submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'submit-answer') {
    event.waitUntil(
      // Get all pending submissions from IndexedDB
      // and try to submit them
      syncPendingSubmissions()
    );
  }
});

// Function to sync pending submissions
async function syncPendingSubmissions() {
  console.log('Syncing pending submissions');
  
  try {
    // Open database
    const db = await openDatabase();
    const pendingSubmissions = await getPendingSubmissions(db);
    
    console.log(`Found ${pendingSubmissions.length} pending submissions to sync`);
    
    // Try to submit each pending submission
    for (const submission of pendingSubmissions) {
      try {
        // Attempt to send to the server
        const response = await fetch('/api/answer-submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(submission.data)
        });
        
        if (response.ok) {
          // If successful, remove from pending
          await removeSubmission(db, submission.id);
          console.log(`Successfully synced submission ${submission.id}`);
          
          // Notify the user
          self.registration.showNotification('Submission Synced', {
            body: 'Your answer submission has been successfully uploaded.',
            icon: '/icons/icon-192x192.png'
          });
        } else {
          console.log(`Failed to sync submission ${submission.id}: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Error syncing submission ${submission.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in syncPendingSubmissions:', error);
  }
}

// Open the IndexedDB database
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ExamShareOfflineDB', 1);
    
    request.onerror = (event) => {
      reject('Error opening IndexedDB');
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores for different data types
      if (!db.objectStoreNames.contains('pendingSubmissions')) {
        db.createObjectStore('pendingSubmissions', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('cachedQuestionPapers')) {
        db.createObjectStore('cachedQuestionPapers', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('cachedSubmissions')) {
        db.createObjectStore('cachedSubmissions', { keyPath: 'id' });
      }
    };
  });
}

// Get all pending submissions from IndexedDB
function getPendingSubmissions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingSubmissions'], 'readonly');
    const store = transaction.objectStore('pendingSubmissions');
    const request = store.getAll();
    
    request.onerror = (event) => {
      reject('Error getting pending submissions from IndexedDB');
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
}

// Remove a submission from IndexedDB
function removeSubmission(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingSubmissions'], 'readwrite');
    const store = transaction.objectStore('pendingSubmissions');
    const request = store.delete(id);
    
    request.onerror = (event) => {
      reject('Error removing submission from IndexedDB');
    };
    
    request.onsuccess = (event) => {
      resolve();
    };
  });
}

// Store a submission in IndexedDB for later syncing
function storeSubmission(data) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(['pendingSubmissions'], 'readwrite');
      const store = transaction.objectStore('pendingSubmissions');
      const request = store.add({ data, timestamp: new Date().toISOString() });
      
      request.onerror = (event) => {
        reject('Error storing submission in IndexedDB');
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    } catch (error) {
      reject(error);
    }
  });
}

// Store a question paper for offline access
function cacheQuestionPaper(paper) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(['cachedQuestionPapers'], 'readwrite');
      const store = transaction.objectStore('cachedQuestionPapers');
      const request = store.put(paper);
      
      request.onerror = (event) => {
        reject('Error caching question paper');
      };
      
      request.onsuccess = (event) => {
        resolve();
      };
    } catch (error) {
      reject(error);
    }
  });
}

// Get a cached question paper
function getCachedQuestionPaper(id) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(['cachedQuestionPapers'], 'readonly');
      const store = transaction.objectStore('cachedQuestionPapers');
      const request = store.get(id);
      
      request.onerror = (event) => {
        reject('Error getting cached question paper');
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    } catch (error) {
      reject(error);
    }
  });
}
