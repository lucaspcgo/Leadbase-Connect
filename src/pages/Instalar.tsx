import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePWA } from '@/hooks/usePWA';
import { useGA4Events } from '@/hooks/useGA4Events';
import { 
  Download, 
  Smartphone, 
  Zap, 
  Wifi, 
  Bell, 
  Share,
  Plus,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Instalar = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isMobile, isStandalone, installApp, canPromptInstall } = usePWA();
  const { trackPWAInstallClick, trackPWAInstallSuccess } = useGA4Events();
  const navigate = useNavigate();

  const handleInstall = async () => {
    trackPWAInstallClick('page');
    const success = await installApp();
    if (success) {
      trackPWAInstallSuccess('page');
    }
  };

  const benefits = [
    { icon: Zap, title: 'Acesso Rápido', description: 'Abra o app direto da tela inicial do seu dispositivo' },
    { icon: Wifi, title: 'Funciona Offline', description: 'Acesse informações mesmo sem conexão com internet' },
    { icon: Bell, title: 'Notificações', description: 'Receba alertas importantes sobre seus leads' },
    { icon: Smartphone, title: 'Experiência Nativa', description: 'Interface otimizada para dispositivos móveis' },
  ];

  return (
    <MainLayout>
      <div className="container py-8 md:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge className="mb-4" variant="secondary">
              📱 App Disponível
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Instale o Lead Base
            </h1>
            <p className="text-lg text-muted-foreground">
              Tenha acesso aos seus leads de forma rápida e prática, 
              direto do seu smartphone ou tablet.
            </p>
          </div>

          {/* Status Card */}
          {isInstalled || isStandalone ? (
            <Card className="mb-8 border-success/20 bg-success/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-success/10">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">App Instalado!</h3>
                    <p className="text-muted-foreground">
                      O Lead Base já está instalado no seu dispositivo.
                    </p>
                  </div>
                </div>
                <Button className="w-full mt-4" onClick={() => navigate('/dashboard')}>
                  Ir para o Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Como Instalar
                </CardTitle>
                <CardDescription>
                  Siga os passos abaixo para instalar o app no seu dispositivo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isIOS ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      No Safari, siga estes passos:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">
                          1
                        </span>
                        <div>
                          <p className="font-medium">Toque no botão Compartilhar</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Share className="h-4 w-4" /> Na barra inferior do Safari
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">
                          2
                        </span>
                        <div>
                          <p className="font-medium">Role e selecione "Adicionar à Tela de Início"</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Plus className="h-4 w-4" /> Pode estar na segunda linha de opções
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">
                          3
                        </span>
                        <div>
                          <p className="font-medium">Confirme tocando em "Adicionar"</p>
                          <p className="text-sm text-muted-foreground">
                            O ícone do Lead Base aparecerá na sua tela inicial
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : canPromptInstall ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Clique no botão abaixo para instalar o app no seu dispositivo.
                    </p>
                    <Button size="lg" className="w-full" onClick={handleInstall}>
                      <Download className="mr-2 h-5 w-5" />
                      Instalar Lead Base
                    </Button>
                  </div>
                ) : isAndroid ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      No Chrome, siga estes passos:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">
                          1
                        </span>
                        <div>
                          <p className="font-medium">Toque no menu do navegador</p>
                          <p className="text-sm text-muted-foreground">
                            Clique nos três pontos (⋮) no canto superior direito
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">
                          2
                        </span>
                        <div>
                          <p className="font-medium">Selecione "Instalar app"</p>
                          <p className="text-sm text-muted-foreground">
                            Ou "Adicionar à tela inicial" dependendo do navegador
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Para instalar, use o menu do seu navegador:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">
                          1
                        </span>
                        <div>
                          <p className="font-medium">Abra o menu do navegador</p>
                          <p className="text-sm text-muted-foreground">
                            Clique nos três pontos (⋮) no canto superior direito
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">
                          2
                        </span>
                        <div>
                          <p className="font-medium">Selecione "Instalar app" ou "Adicionar à tela inicial"</p>
                          <p className="text-sm text-muted-foreground">
                            A opção pode variar dependendo do navegador
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{benefit.title}</h4>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Instalar;
