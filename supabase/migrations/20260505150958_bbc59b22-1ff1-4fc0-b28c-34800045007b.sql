-- Create a table to store search performance metrics
CREATE TABLE IF NOT EXISTS public.search_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_type TEXT NOT NULL,
    filters JSONB,
    execution_time_ms INTEGER NOT NULL,
    results_count INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.search_performance_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs
CREATE POLICY "Users can insert search logs" 
ON public.search_performance_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to view logs (for dashboard/monitoring)
CREATE POLICY "Users can view search logs" 
ON public.search_performance_logs 
FOR SELECT 
TO authenticated 
USING (true);

-- Add index for performance analysis
CREATE INDEX idx_search_logs_type_created ON public.search_performance_logs (search_type, created_at DESC);
CREATE INDEX idx_search_logs_execution_time ON public.search_performance_logs (execution_time_ms);