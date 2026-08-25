import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Target, History, Heart, Users, CheckCircle } from 'lucide-react';

interface PageContent {
  hero: {
    title: string;
    subtitle: string;
  };
  sections: Array<{
    title: string;
    content: string;
  }>;
}

const SobreNos = () => {
  const [content, setContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      const { data, error } = await supabase
        .from('page_contents')
        .select('content')
        .eq('page_slug', 'sobre-nos')
        .eq('is_published', true)
        .single();

      if (!error && data) {
        setContent(data.content as unknown as PageContent);
      }
      setLoading(false);
    };

    fetchContent();
  }, []);

  const sectionIcons = [Target, History, Heart];

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-12 space-y-8">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!content) {
    return (
      <MainLayout>
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">Página em construção</h1>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {content.hero.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {content.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            {content.sections.map((section, index) => {
              const Icon = sectionIcons[index] || CheckCircle;
              return (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4">{section.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-primary">5M+</p>
              <p className="text-muted-foreground mt-2">Empresas Cadastradas</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary">10K+</p>
              <p className="text-muted-foreground mt-2">Clientes Ativos</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary">99%</p>
              <p className="text-muted-foreground mt-2">Satisfação</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary">24/7</p>
              <p className="text-muted-foreground mt-2">Suporte</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="container text-center">
          <Users className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Nossa Equipe</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-12">
            Somos um time apaixonado por tecnologia e inovação, trabalhando todos os dias para entregar a melhor experiência aos nossos clientes.
          </p>
        </div>
      </section>
    </MainLayout>
  );
};

export default SobreNos;
