import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { 
  Database, 
  Search, 
  Building2, 
  TrendingUp, 
  Shield, 
  Zap,
  Users,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Building2, title: '+45 milhões', subtitle: 'de empresas brasileiras' },
    { icon: Search, title: 'Filtros avançados', subtitle: 'por CNAE, UF, porte e mais' },
    { icon: FileSpreadsheet, title: 'Importação fácil', subtitle: 'via CSV ou colagem' },
    { icon: Shield, title: 'Dados seguros', subtitle: 'em conformidade LGPD' },
  ];

  const benefits = [
    'Acesso a dados atualizados de empresas',
    'Filtros por localização, CNAE e porte',
    'Contatos diretos: telefone e email',
    'Informações de sócios e capital social',
    'Exportação para CSV e Excel',
    'API para integrações',
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
        <div className="container relative py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20">
              🚀 A base de leads B2B mais completa do Brasil
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Encontre os leads certos para o seu negócio
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Acesse dados de milhões de empresas brasileiras. Filtre por localização, 
              segmento, porte e muito mais. Prospecte com inteligência.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" onClick={() => navigate('/cadastro')} className="text-lg px-8">
                Começar Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/precos')} className="text-lg px-8 bg-transparent border-white/30 text-white hover:bg-white/10">
                Ver Planos
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-b bg-card">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Por que escolher?</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Tudo que você precisa para prospectar
              </h2>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-8" size="lg" onClick={() => navigate('/cadastro')}>
                Criar conta grátis
              </Button>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border shadow-soft flex items-center justify-center">
                <div className="text-center p-8">
                  <Database className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-lg font-medium">Interface moderna e intuitiva</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-primary text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para encontrar seus próximos clientes?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
            Comece agora com 10 créditos grátis. Sem cartão de crédito.
          </p>
          <Button size="lg" variant="secondary" onClick={() => navigate('/cadastro')} className="text-lg px-8">
            Começar Agora
            <Zap className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
