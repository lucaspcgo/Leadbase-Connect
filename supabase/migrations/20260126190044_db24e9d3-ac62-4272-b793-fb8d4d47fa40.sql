-- Create import_logs table to track import history
CREATE TABLE public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  admin_name TEXT NOT NULL,
  filename TEXT,
  source TEXT NOT NULL DEFAULT 'file', -- 'file' or 'paste'
  total_rows INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  ufs_imported TEXT[], -- Array of UFs imported
  duplicate_mode TEXT NOT NULL DEFAULT 'skip', -- 'update' or 'skip'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view import logs
CREATE POLICY "Admins can view all import logs" 
  ON public.import_logs 
  FOR SELECT 
  USING (is_admin(auth.uid()));

-- Only admins can insert import logs
CREATE POLICY "Admins can insert import logs" 
  ON public.import_logs 
  FOR INSERT 
  WITH CHECK (is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_import_logs_created_at ON public.import_logs(created_at DESC);
CREATE INDEX idx_import_logs_admin_id ON public.import_logs(admin_id);