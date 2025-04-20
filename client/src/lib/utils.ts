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
        return registration.sync.register(tag);
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
  // This would be implemented with IndexedDB in a real application
  console.log(`Storing data in ${storeName} for offline use:`, data);
  
  // For the purpose of this example, we'll just use localStorage
  try {
    const existingData = localStorage.getItem(storeName);
    const items = existingData ? JSON.parse(existingData) : [];
    items.push({
      ...data,
      id: Date.now(), // Use timestamp as temp ID
      pendingSync: true
    });
    localStorage.setItem(storeName, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to store data for offline use:', err);
  }
};

// Detect file type from base64 string
export const getFileTypeFromBase64 = (base64String: string): string => {
  const match = base64String.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  return match ? match[1] : '';
};
