import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  // Always start with `true` so server and client initial render match.
  // We sync the real value after hydration via useEffect.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sync real status after mount (client only)
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
