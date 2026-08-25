import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePWA } from './usePWA';
import { usePushNotifications } from './usePushNotifications';

const AUTO_PUSH_PROMPTED_KEY = 'pwa-push-auto-prompted';

/**
 * Hook that automatically prompts for push notification permission
 * when the PWA is installed (running in standalone mode).
 * 
 * Only prompts once per device to avoid annoying the user.
 */
export function useAutoEnablePushNotifications() {
  const { user } = useAuth();
  const { isStandalone } = usePWA();
  const { isSupported, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const hasAttempted = useRef(false);

  useEffect(() => {
    // Only run this logic once per mount
    if (hasAttempted.current) return;

    // Conditions to auto-prompt:
    // 1. User must be logged in
    // 2. App must be running in standalone mode (PWA installed)
    // 3. Push notifications must be supported
    // 4. User must not already be subscribed
    // 5. Must not have been prompted before (localStorage check)
    // 6. Must not be in loading state

    if (!user) return;
    if (!isStandalone) return;
    if (!isSupported) return;
    if (isSubscribed) return;
    if (isLoading) return;

    // Check if we've already prompted this user on this device
    const alreadyPrompted = localStorage.getItem(AUTO_PUSH_PROMPTED_KEY);
    if (alreadyPrompted) return;

    // Mark as attempted to prevent multiple prompts
    hasAttempted.current = true;

    // Small delay to let the app fully load before prompting
    const timeoutId = setTimeout(async () => {
      try {
        // Mark as prompted before actually prompting
        // This ensures we don't prompt again even if user denies
        localStorage.setItem(AUTO_PUSH_PROMPTED_KEY, 'true');
        
        // Attempt to subscribe (this will show the browser permission dialog)
        await subscribe();
      } catch (error) {
        console.error('Auto push notification subscription failed:', error);
      }
    }, 2000); // 2 second delay for better UX

    return () => clearTimeout(timeoutId);
  }, [user, isStandalone, isSupported, isSubscribed, isLoading, subscribe]);
}
