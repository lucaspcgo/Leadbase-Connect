import { useAutoEnablePushNotifications } from '@/hooks/useAutoEnablePushNotifications';

/**
 * Component that automatically prompts for push notification permission
 * when the PWA is installed. This is invisible - it just runs the hook.
 */
export function AutoPushNotificationSetup() {
  useAutoEnablePushNotifications();
  return null;
}
