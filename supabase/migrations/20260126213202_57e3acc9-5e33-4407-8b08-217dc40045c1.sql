-- Allow users to insert their own invoices
CREATE POLICY "Users can insert own invoices" 
ON public.invoices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);