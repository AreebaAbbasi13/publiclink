/**
 * DataSyncContext — lightweight global event bus for triggering immediate
 * data refreshes across all components after any mutation (add, update, delete).
 *
 * Usage in mutation handlers:
 *   const { notifyDataChanged } = useDataSync();
 *   // after successful API mutation:
 *   notifyDataChanged();
 *
 * Usage in data-fetching components:
 *   const { subscribeToChanges } = useDataSync();
 *   useEffect(() => {
 *     const unsubscribe = subscribeToChanges(fetchData);
 *     return unsubscribe;
 *   }, []);
 */
import React, { createContext, useContext, useCallback, useRef } from 'react';

const DataSyncContext = createContext(null);

export function DataSyncProvider({ children }) {
  const listenersRef = useRef(new Set());

  const subscribeToChanges = useCallback((fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  const notifyDataChanged = useCallback(() => {
    listenersRef.current.forEach(fn => {
      try { fn(); } catch (e) { /* ignore */ }
    });
  }, []);

  return (
    <DataSyncContext.Provider value={{ notifyDataChanged, subscribeToChanges }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export function useDataSync() {
  const ctx = useContext(DataSyncContext);
  if (!ctx) throw new Error('useDataSync must be used inside DataSyncProvider');
  return ctx;
}
