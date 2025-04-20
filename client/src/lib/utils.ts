import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date string
export const formatDate = (date: Date | string): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// Format time string
export const formatTime = (date: Date | string): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Format duration (convert minutes to hours/minutes string)
export const formatDuration = (minutes: number): string => {
  if (!minutes) return '';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${minutes} minutes`;
  } else if (mins === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
  }
};

// Get user initials from full name
export const getUserInitials = (fullName: string): string => {
  if (!fullName) return '';
  
  return fullName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase();
};

// Convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Register for background sync if browser supports it
export const registerBackgroundSync = (tag: string): Promise<void> => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    return navigator.serviceWorker.ready
      .then(registration => {
        // Type assertion to handle sync property that might not be recognized by TypeScript
        const syncManager = (registration as any).sync;
        if (syncManager) {
          return syncManager.register(tag);
        }
        return Promise.resolve();
      })
      .then(() => {
        console.log('Background sync registered:', tag);
      })
      .catch(err => {
        console.error('Background sync registration failed:', err);
      });
  }
  return Promise.resolve();
};

// Check if application is online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Store data in IndexedDB for offline use
export const storeForOffline = async (storeName: string, data: any): Promise<void> => {
  console.log(`Storing data in ${storeName} for offline use:`, data);

  return new Promise((resolve, reject) => {
    // Open (or create) the database
    const request = indexedDB.open('ExamShareOfflineDB', 1);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject('Error opening database');
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores for different data types if they don't exist
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
    
    request.onsuccess = (event) => {
      try {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Use a transaction for the specified store
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        // Add the data to the object store
        const record = {
          ...data,
          timestamp: new Date().toISOString(),
          pendingSync: true
        };
        
        // If the data already has an id property, use it, otherwise let autoIncrement handle it
        const addRequest = data.id ? store.put(record) : store.add(record);
        
        addRequest.onsuccess = () => {
          console.log(`Successfully stored data in ${storeName}`);
          
          // Register for background sync if the browser supports it
          if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready
              .then(registration => {
                // Type assertion to handle sync property that might not be recognized by TypeScript
                const syncManager = (registration as any).sync;
                if (syncManager) {
                  return syncManager.register('submit-answer');
                }
                return Promise.resolve();
              })
              .catch(err => {
                console.error('Background sync registration failed:', err);
              });
          }
          
          resolve();
        };
        
        addRequest.onerror = (event) => {
          console.error('Error storing data:', event);
          reject('Error storing data');
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      } catch (error) {
        console.error('Error in IndexedDB transaction:', error);
        reject(error);
      }
    };
  });
};

// Get offline stored data
export const getOfflineData = async (storeName: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ExamShareOfflineDB', 1);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject('Error opening database');
    };
    
    request.onsuccess = (event) => {
      try {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Check if the store exists
        if (!db.objectStoreNames.contains(storeName)) {
          resolve([]);
          return;
        }
        
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result);
        };
        
        getAllRequest.onerror = (event) => {
          console.error('Error retrieving data:', event);
          reject('Error retrieving data');
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      } catch (error) {
        console.error('Error in IndexedDB transaction:', error);
        reject(error);
      }
    };
  });
};

// Detect file type from base64 string
export const getFileTypeFromBase64 = (base64String: string): string => {
  const match = base64String.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  return match ? match[1] : '';
};
