-- Create table for page content management
CREATE TABLE public.page_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  meta_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "Anyone can read published pages"
ON public.page_contents
FOR SELECT
USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage all pages"
ON public.page_contents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'master_admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_page_contents_updated_at
BEFORE UPDATE ON public.page_contents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pages
INSERT INTO public.page_contents (page_slug, title, content, meta_description, is_published) VALUES
('sobre-nos', 'Sobre Nós', '{"hero": {"title": "Sobre a LeadBase", "subtitle": "Conectando empresas aos melhores leads do mercado"}, "sections": [{"title": "Nossa Missão", "content": "Facilitar o acesso a informações empresariais de qualidade para impulsionar o crescimento de negócios em todo o Brasil."}, {"title": "Nossa História", "content": "Fundada em 2024, a LeadBase nasceu da necessidade de democratizar o acesso a dados empresariais confiáveis e atualizados."}, {"title": "Nossos Valores", "content": "Transparência, inovação e compromisso com a qualidade são os pilares que guiam todas as nossas ações."}]}', 'Conheça a LeadBase - sua parceira na prospecção de clientes e geração de leads qualificados.', true),
('contato', 'Contato', '{"hero": {"title": "Entre em Contato", "subtitle": "Estamos aqui para ajudar"}, "info": {"email": "contato@leadbase.com.br", "phone": "(11) 99999-9999", "address": "São Paulo, SP - Brasil"}, "form": {"enabled": true}}', 'Entre em contato com a LeadBase. Tire suas dúvidas e saiba como podemos ajudar seu negócio.', true),
('blog', 'Blog', '{"hero": {"title": "Blog LeadBase", "subtitle": "Dicas e novidades sobre prospecção e vendas"}, "posts": []}', 'Blog da LeadBase - Artigos sobre prospecção, vendas e geração de leads.', true),
('carreiras', 'Carreiras', '{"hero": {"title": "Trabalhe Conosco", "subtitle": "Faça parte do nosso time"}, "intro": "Estamos sempre em busca de talentos que compartilham nossa paixão por inovação e tecnologia.", "benefits": ["Trabalho remoto", "Horário flexível", "Plano de saúde", "Vale refeição"], "positions": []}', 'Vagas de emprego na LeadBase. Venha fazer parte do nosso time!', true);

-- Create blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id UUID REFERENCES auth.users(id),
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Anyone can read published posts"
ON public.blog_posts
FOR SELECT
USING (is_published = true);

-- Admins can manage posts
CREATE POLICY "Admins can manage all posts"
ON public.blog_posts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'master_admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create job positions table
CREATE TABLE public.job_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  type TEXT, -- full-time, part-time, contract
  description TEXT NOT NULL,
  requirements TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;

-- Public can read active positions
CREATE POLICY "Anyone can read active positions"
ON public.job_positions
FOR SELECT
USING (is_active = true);

-- Admins can manage positions
CREATE POLICY "Admins can manage all positions"
ON public.job_positions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'master_admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_job_positions_updated_at
BEFORE UPDATE ON public.job_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();