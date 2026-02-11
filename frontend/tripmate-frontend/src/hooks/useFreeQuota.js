import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY_PREFIX = 'tripmate_free_used';

/**
 * Custom hook for managing free user question quota
 * @param {number|string|null} userId - User ID
 * @param {boolean} isPremium - Whether user is premium
 * @param {number} limit - Question limit (default 5)
 * @returns {object} Quota state and methods
 */
export function useFreeQuota(userId, isPremium, limit = 5) {
  const [used, setUsed] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const pendingIncrementRef = useRef(0); // Track pending optimistic increments
  const lastSyncRef = useRef(null); // Track last sync time to prevent race conditions

  // Get storage key for this user
  const getStorageKey = useCallback(() => {
    if (!userId) return null;
    return `${STORAGE_KEY_PREFIX}:${userId}`;
  }, [userId]);

  // Load from localStorage
  const loadFromStorage = useCallback(() => {
    const key = getStorageKey();
    if (!key) return null;
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }
    return null;
  }, [getStorageKey]);

  // Save to localStorage
  const saveToStorage = useCallback((value) => {
    const key = getStorageKey();
    if (!key) return;
    try {
      localStorage.setItem(key, String(value));
      // Dispatch custom event for same-tab sync (storage events only fire in other tabs)
      window.dispatchEvent(new CustomEvent('freeQuotaUpdate', {
        detail: { key, value }
      }));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }, [getStorageKey]);

  // Sync from server (fetch current usage from backend)
  const syncFromServer = useCallback(async (fetchFn) => {
    if (isPremium || !userId) {
      setUsed(0);
      setIsInitialized(true);
      return 0;
    }

    try {
      const serverValue = await fetchFn();
      if (serverValue !== null && serverValue !== undefined) {
        const numValue = typeof serverValue === 'number' ? serverValue : parseInt(serverValue, 10);
        if (!isNaN(numValue) && numValue >= 0) {
          const now = Date.now();
          // Only update if this is the latest sync (prevent race conditions)
          if (!lastSyncRef.current || now >= lastSyncRef.current) {
            lastSyncRef.current = now;
            setUsed(numValue);
            saveToStorage(numValue);
            console.log(`[FreeQuota] Synced from server: ${numValue}`);
            return numValue;
          }
        }
      }
    } catch (error) {
      console.error('[FreeQuota] Error syncing from server:', error);
      // Fallback to localStorage on error
      const stored = loadFromStorage();
      if (stored !== null) {
        setUsed(stored);
        return stored;
      }
    }
    return used;
  }, [isPremium, userId, saveToStorage, loadFromStorage, used]);

  // Initialize: load from storage first for instant UI, then sync from server
  useEffect(() => {
    if (isPremium || !userId) {
      setUsed(0);
      setIsInitialized(true);
      return;
    }

    // Load from localStorage immediately for instant UI
    const stored = loadFromStorage();
    if (stored !== null) {
      setUsed(stored);
      console.log(`[FreeQuota] Initialized from localStorage: ${stored}`);
    } else {
      setUsed(0);
    }
    setIsInitialized(true);
  }, [userId, isPremium, loadFromStorage]);

  // Listen for storage events (multi-tab sync) and custom events (same-tab sync)
  useEffect(() => {
    if (isPremium || !userId) return;

    const key = getStorageKey();
    
    // Handle storage events from OTHER tabs
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        const newValue = parseInt(e.newValue, 10);
        if (!isNaN(newValue) && newValue >= 0) {
          console.log(`[FreeQuota] Storage event from other tab: ${used} -> ${newValue}`);
          setUsed(newValue);
        }
      }
    };

    // Handle custom events from SAME tab
    const handleCustomUpdate = (e) => {
      if (e.detail && e.detail.key === key && e.detail.value !== undefined) {
        const newValue = typeof e.detail.value === 'number' ? e.detail.value : parseInt(e.detail.value, 10);
        if (!isNaN(newValue) && newValue >= 0) {
          console.log(`[FreeQuota] Custom event from same tab: ${used} -> ${newValue}`);
          setUsed(newValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('freeQuotaUpdate', handleCustomUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('freeQuotaUpdate', handleCustomUpdate);
    };
  }, [userId, isPremium, getStorageKey, used]);

  // Optimistic increment (before API call)
  const incrementOptimistic = useCallback(() => {
    if (isPremium) return;
    
    setUsed(prev => {
      const newValue = Math.min(prev + 1, limit);
      pendingIncrementRef.current += 1;
      saveToStorage(newValue);
      console.log(`[FreeQuota] Optimistic increment: ${prev} -> ${newValue}`);
      return newValue;
    });
  }, [isPremium, limit, saveToStorage]);

  // Rollback (on API failure)
  const rollback = useCallback(() => {
    if (isPremium) return;
    
    setUsed(prev => {
      const newValue = Math.max(0, prev - 1);
      pendingIncrementRef.current = Math.max(0, pendingIncrementRef.current - 1);
      saveToStorage(newValue);
      console.log(`[FreeQuota] Rollback: ${prev} -> ${newValue}`);
      return newValue;
    });
  }, [isPremium, saveToStorage]);

  // Update from server response (after successful API call)
  const updateFromServer = useCallback((serverValue) => {
    if (isPremium) return;
    
    console.log(`[FreeQuota] updateFromServer called with:`, serverValue, "type:", typeof serverValue);
    
    if (serverValue !== null && serverValue !== undefined) {
      const numValue = typeof serverValue === 'number' ? serverValue : parseInt(serverValue, 10);
      console.log(`[FreeQuota] Parsed numValue:`, numValue, "isNaN:", isNaN(numValue));
      if (!isNaN(numValue) && numValue >= 0) {
        setUsed(prev => {
          console.log(`[FreeQuota] Updating from server: ${prev} -> ${numValue}`);
          return numValue;
        });
        saveToStorage(numValue);
        pendingIncrementRef.current = 0; // Reset pending count
        console.log(`[FreeQuota] Updated from server: ${numValue}`);
      } else {
        console.warn(`[FreeQuota] Invalid server value: ${serverValue}, parsed: ${numValue}`);
      }
    } else {
      console.warn(`[FreeQuota] Server value is null or undefined: ${serverValue}`);
    }
  }, [isPremium, saveToStorage]);

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    isInitialized,
    incrementOptimistic,
    rollback,
    updateFromServer,
    syncFromServer
  };
}

