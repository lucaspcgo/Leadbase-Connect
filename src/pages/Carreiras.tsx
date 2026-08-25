import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, MapPin, Clock, CheckCircle, Users } from 'lucide-react';

interface JobPosition {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  type: string | null;
  description: string;
  requirements: string[] | null;
}

interface PageContent {
  hero: {
    title: string;
    subtitle: string;
  };
  intro: string;
  benefits: string[];
}

const Carreiras = () => {
  const [content, setContent] = useState<PageContent | null>(null);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch page content
      const { data: pageData } = await supabase
        .from('page_contents')
        .select('content')
        .eq('page_slug', 'carreiras')
        .eq('is_published', true)
        .single();

      if (pageData) {
        setContent(pageData.content as unknown as PageContent);
      }

      // Fetch job positions
      const { data: positionsData } = await supabase
        .from('job_positions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (positionsData) {
        setPositions(positionsData);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case 'full-time':
        return 'Tempo Integral';
      case 'part-time':
        return 'Meio Período';
      case 'contract':
        return 'Contrato';
      default:
        return type || 'N/A';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-12 space-y-8">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-64" />
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
          <Users className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {content?.hero.title || 'Trabalhe Conosco'}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {content?.hero.subtitle || 'Faça parte do nosso time'}
          </p>
        </div>
      </section>

      {/* Intro & Benefits */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-lg text-muted-foreground">
              {content?.intro || 'Estamos sempre em busca de talentos.'}
            </p>
          </div>

          {content?.benefits && content.benefits.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-16">
              {content.benefits.map((benefit, index) => (
                <Card key={index} className="border-0 shadow-md text-center">
                  <CardContent className="p-6">
                    <CheckCircle className="h-8 w-8 text-primary mx-auto mb-3" />
                    <p className="font-medium">{benefit}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Job Positions */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">
            <Briefcase className="inline-block h-8 w-8 mr-2 text-primary" />
            Vagas Abertas
          </h2>

          {positions.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                Nenhuma vaga aberta no momento
              </h3>
              <p className="text-muted-foreground">
                Cadastre seu currículo e entraremos em contato quando surgirem oportunidades.
              </p>
              <Button className="mt-4" asChild>
                <a href="mailto:carreiras@leadbase.com.br">Enviar Currículo</a>
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {positions.map((position) => (
                <Card key={position.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="mb-2">{position.title}</CardTitle>
                        <div className="flex flex-wrap gap-2">
                          {position.department && (
                            <Badge variant="secondary">{position.department}</Badge>
                          )}
                          {position.type && (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {getTypeLabel(position.type)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {position.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                        <MapPin className="h-4 w-4" />
                        {position.location}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {position.description}
                    </p>
                    {position.requirements && position.requirements.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2">Requisitos:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {position.requirements.slice(0, 3).map((req, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Button className="w-full" asChild>
                      <a href={`mailto:carreiras@leadbase.com.br?subject=Candidatura: ${position.title}`}>
                        Candidatar-se
                      </a>
                    </Button>
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

export default Carreiras;
