import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, User, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
}

interface PageContent {
  hero: {
    title: string;
    subtitle: string;
  };
}

const Blog = () => {
  const [content, setContent] = useState<PageContent | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch page content
      const { data: pageData } = await supabase
        .from('page_contents')
        .select('content')
        .eq('page_slug', 'blog')
        .eq('is_published', true)
        .single();

      if (pageData) {
        setContent(pageData.content as unknown as PageContent);
      }

      // Fetch blog posts
      const { data: postsData } = await supabase
        .from('blog_posts')
        .select('id, slug, title, excerpt, cover_image, published_at, created_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (postsData) {
        setPosts(postsData);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-12 space-y-8">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container text-center">
          <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {content?.hero.title || 'Blog'}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {content?.hero.subtitle || 'Novidades e dicas sobre prospecção e vendas'}
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-16">
        <div className="container">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                Nenhum artigo publicado ainda
              </h2>
              <p className="text-muted-foreground">
                Em breve teremos novos conteúdos. Volte mais tarde!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  {post.cover_image && (
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(post.published_at || post.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </div>
                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    {post.excerpt && (
                      <CardDescription className="line-clamp-3">
                        {post.excerpt}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="text-primary font-medium hover:underline"
                    >
                      Ler mais →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default Blog;
