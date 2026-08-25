import { MainLayout } from '@/components/layout/MainLayout';
import { Cookie, Settings, BarChart, Shield, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PoliticaCookies = () => {
  const tiposCookies = [
    {
      icon: Lock,
      titulo: "Cookies Essenciais",
      descricao: "Necessários para o funcionamento básico do site. Incluem cookies de sessão e autenticação.",
      obrigatorio: true
    },
    {
      icon: BarChart,
      titulo: "Cookies de Análise",
      descricao: "Nos ajudam a entender como os visitantes interagem com o site, permitindo melhorias contínuas.",
      obrigatorio: false
    },
    {
      icon: Settings,
      titulo: "Cookies de Preferências",
      descricao: "Permitem que o site lembre suas escolhas, como idioma e região, para uma experiência personalizada.",
      obrigatorio: false
    },
    {
      icon: Shield,
      titulo: "Cookies de Segurança",
      descricao: "Utilizados para detectar atividades maliciosas e proteger sua conta contra acessos não autorizados.",
      obrigatorio: true
    }
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-6">
              <Cookie className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Política de Cookies</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Saiba como o LeadsBase Pro utiliza cookies para melhorar sua experiência de navegação.
            </p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            {/* O que são Cookies */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">O que são Cookies?</h2>
              <div className="bg-muted/50 rounded-lg p-6">
                <p className="mb-4">
                  Cookies são pequenos arquivos de texto armazenados no seu dispositivo (computador, tablet ou celular) quando você visita um site. Eles são amplamente utilizados para fazer os sites funcionarem de forma mais eficiente e fornecer informações aos proprietários do site.
                </p>
                <p>
                  Os cookies não contêm informações que identifiquem você pessoalmente, mas as informações que coletamos podem ser vinculadas a você se você fornecer dados pessoais.
                </p>
              </div>
            </section>

            {/* Tipos de Cookies */}
            <section>
              <h2 className="text-2xl font-semibold mb-6">Tipos de Cookies que Utilizamos</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {tiposCookies.map((cookie, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center gap-3">
                          <cookie.icon className="h-5 w-5 text-primary" />
                          {cookie.titulo}
                        </span>
                        {cookie.obrigatorio && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Essencial
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm">
                        {cookie.descricao}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Cookies Específicos */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Cookies Utilizados</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Cookie</th>
                      <th className="text-left py-3 px-4 font-medium">Finalidade</th>
                      <th className="text-left py-3 px-4 font-medium">Duração</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b">
                      <td className="py-3 px-4 font-mono text-xs">sb-*-auth-token</td>
                      <td className="py-3 px-4">Autenticação e sessão do usuário</td>
                      <td className="py-3 px-4">Sessão</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-mono text-xs">theme</td>
                      <td className="py-3 px-4">Preferência de tema (claro/escuro)</td>
                      <td className="py-3 px-4">1 ano</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-mono text-xs">cookie_consent</td>
                      <td className="py-3 px-4">Registro do consentimento de cookies</td>
                      <td className="py-3 px-4">1 ano</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Como Gerenciar */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Como Gerenciar Cookies</h2>
              <div className="space-y-4">
                <p>
                  Você pode controlar e/ou excluir cookies conforme desejar. A maioria dos navegadores permite que você:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Veja quais cookies você tem e os exclua individualmente</li>
                  <li>Bloqueie cookies de terceiros</li>
                  <li>Bloqueie cookies de sites específicos</li>
                  <li>Bloqueie todos os cookies</li>
                  <li>Exclua todos os cookies quando fechar o navegador</li>
                </ul>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    <strong>Atenção:</strong> Se você bloquear cookies essenciais, algumas funcionalidades do site podem não funcionar corretamente, como login e preferências salvas.
                  </p>
                </div>
              </div>
            </section>

            {/* Configurações por Navegador */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Configurações por Navegador</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Google Chrome</h3>
                  <p className="text-sm text-muted-foreground">
                    Configurações → Privacidade e segurança → Cookies e outros dados do site
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Mozilla Firefox</h3>
                  <p className="text-sm text-muted-foreground">
                    Configurações → Privacidade e Segurança → Cookies e dados de sites
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Safari</h3>
                  <p className="text-sm text-muted-foreground">
                    Preferências → Privacidade → Cookies e dados de sites
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Microsoft Edge</h3>
                  <p className="text-sm text-muted-foreground">
                    Configurações → Privacidade → Cookies e permissões de site
                  </p>
                </div>
              </div>
            </section>

            {/* Atualizações */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Atualizações desta Política</h2>
              <p>
                Podemos atualizar esta Política de Cookies periodicamente para refletir alterações em nossas práticas ou por outras razões operacionais, legais ou regulatórias. Recomendamos que você visite esta página regularmente para se manter informado sobre nosso uso de cookies.
              </p>
              <p className="text-muted-foreground mt-4">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PoliticaCookies;
