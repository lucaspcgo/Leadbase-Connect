
-- Remove the overly permissive "Service role can manage scheduled notifications" policy
DROP POLICY IF EXISTS "Service role can manage scheduled notifications" ON public.scheduled_notifications;

-- Add policy so users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.scheduled_notifications
FOR SELECT
USING (auth.uid() = target_user_id);
