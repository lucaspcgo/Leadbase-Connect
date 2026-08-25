import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Key, Globe, Zap, Webhook, Shield, BookOpen } from 'lucide-react';

const CodeBlock = ({ children, language = 'bash' }: { children: string; language?: string }) => (
  <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm font-mono">
    <code>{children}</code>
  </pre>
);

const EndpointCard = ({ method, path, description, params, response }: {
  method: string;
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  response: string;
}) => (
  <Card className="mb-4">
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <Badge variant={method === 'GET' ? 'default' : 'secondary'} className="font-mono">
          {method}
        </Badge>
        <code className="text-sm font-semibold">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </CardHeader>
    <CardContent className="space-y-3">
      {params && params.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Parâmetros</h4>
          <div className="space-y-1">
            {params.map(p => (
              <div key={p.name} className="flex items-start gap-2 text-sm">
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{p.name}</code>
                <span className="text-muted-foreground">{p.type}</span>
                {p.required && <Badge variant="destructive" className="text-xs">obrigatório</Badge>}
                <span className="text-muted-foreground">— {p.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <h4 className="text-sm font-semibold mb-2">Resposta</h4>
        <CodeBlock language="json">{response}</CodeBlock>
      </div>
    </CardContent>
  </Card>
);

const ApiIntegracoes = () => {
  const baseUrl = `https://ehpjcvsnyjuufmapkkrn.supabase.co/functions/v1/api-public`;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Documentação da API</h1>
              <p className="text-muted-foreground">Integre seu sistema com a nossa plataforma de dados empresariais</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="inicio" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="inicio" className="gap-2"><Globe className="h-4 w-4" /> Início</TabsTrigger>
            <TabsTrigger value="auth" className="gap-2"><Key className="h-4 w-4" /> Autenticação</TabsTrigger>
            <TabsTrigger value="endpoints" className="gap-2"><Code className="h-4 w-4" /> Endpoints</TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2"><Webhook className="h-4 w-4" /> Webhooks</TabsTrigger>
            <TabsTrigger value="integracoes" className="gap-2"><Zap className="h-4 w-4" /> Integrações</TabsTrigger>
          </TabsList>

          {/* Getting Started */}
          <TabsContent value="inicio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Começando</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  A API LeadsBase Pro permite que você consulte dados de empresas brasileiras de forma programática.
                  Use-a para integrar com CRMs, automações, chatbots e mais.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">1. Obtenha uma API Key</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Acesse o painel Admin → API & Integrações e crie sua chave</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">2. Faça sua primeira consulta</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Envie requisições HTTP autenticadas para os endpoints</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">3. Automatize</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Integre com n8n, Typebot, Zapier ou qualquer ferramenta</p>
                  </Card>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">URL Base</h3>
                  <CodeBlock>{baseUrl}</CodeBlock>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Exemplo rápido</h3>
                  <CodeBlock language="bash">{`curl -X GET "${baseUrl}/empresas?uf=SP&limit=10" \\
  -H "x-api-key: lb_sua_chave_aqui"`}</CodeBlock>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authentication */}
          <TabsContent value="auth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Autenticação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Todas as requisições devem incluir uma API Key válida. Você pode enviá-la de duas formas:
                </p>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold mb-1">Opção 1: Header x-api-key (recomendado)</h3>
                    <CodeBlock>{`curl -H "x-api-key: lb_sua_chave" ${baseUrl}/health`}</CodeBlock>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Opção 2: Header Authorization</h3>
                    <CodeBlock>{`curl -H "Authorization: Bearer lb_sua_chave" ${baseUrl}/health`}</CodeBlock>
                  </div>
                </div>

                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <h3 className="font-semibold text-destructive mb-1">⚠️ Segurança</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Nunca exponha sua API Key em código frontend ou repositórios públicos</li>
                    <li>• Use variáveis de ambiente para armazenar a chave</li>
                    <li>• Cada chave possui um rate limit configurável</li>
                    <li>• Chaves podem ser revogadas a qualquer momento no painel</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Endpoints */}
          <TabsContent value="endpoints" className="space-y-4">
            <EndpointCard
              method="GET"
              path="/health"
              description="Verifica o status da API"
              response={`{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-02-11T12:00:00Z"
}`}
            />

            <EndpointCard
              method="GET"
              path="/empresas"
              description="Lista empresas com filtros e paginação"
              params={[
                { name: 'cnpj', type: 'string', required: false, description: 'Busca por CNPJ específico (retorna empresa única)' },
                { name: 'uf', type: 'string', required: false, description: 'Filtro por UF (ex: SP, RJ)' },
                { name: 'municipio', type: 'string', required: false, description: 'Filtro por município' },
                { name: 'cnae', type: 'string', required: false, description: 'Filtro por código CNAE' },
                { name: 'search', type: 'string', required: false, description: 'Busca por razão social ou nome fantasia' },
                { name: 'limit', type: 'integer', required: false, description: 'Limite de resultados (máx 100, padrão 25)' },
                { name: 'offset', type: 'integer', required: false, description: 'Offset para paginação' },
              ]}
              response={`{
  "data": [
    {
      "id": 1,
      "cnpj": "00000000000191",
      "razao_social": "EMPRESA EXEMPLO LTDA",
      "nome_fantasia": "EXEMPLO",
      "sit_cadastral": "ATIVA",
      "uf": "SP",
      "municipio": "SAO PAULO",
      ...
    }
  ],
  "pagination": {
    "total": 1500,
    "limit": 25,
    "offset": 0,
    "has_more": true
  }
}`}
            />

            <EndpointCard
              method="GET"
              path="/socios"
              description="Lista sócios de uma empresa pelo CNPJ"
              params={[
                { name: 'cnpj', type: 'string', required: true, description: 'CNPJ da empresa' },
              ]}
              response={`{
  "data": [
    {
      "id": "uuid",
      "nome_socio": "FULANO DE TAL",
      "qualificacao": "Sócio-Administrador",
      "fonte": "importado"
    }
  ]
}`}
            />

            <EndpointCard
              method="GET"
              path="/cnaes"
              description="Lista códigos CNAE disponíveis"
              response={`{
  "data": [
    { "codigo": "4711301", "descricao": "Comércio varejista de mercadorias em geral" },
    { "codigo": "6201501", "descricao": "Desenvolvimento de programas de computador" }
  ]
}`}
            />
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Receba notificações em tempo real quando eventos ocorrem na plataforma. 
                  Configure webhooks no painel Admin → API & Integrações.
                </p>

                <h3 className="font-semibold">Eventos Disponíveis</h3>
                <div className="space-y-2">
                  {[
                    { event: 'empresa.created', desc: 'Disparado quando uma nova empresa é cadastrada' },
                    { event: 'empresa.updated', desc: 'Disparado quando dados de uma empresa são alterados' },
                    { event: 'empresa.enriched', desc: 'Disparado quando dados são enriquecidos via API' },
                    { event: 'user.signup', desc: 'Disparado quando um novo usuário se cadastra' },
                    { event: 'payment.completed', desc: 'Disparado quando um pagamento é confirmado' },
                  ].map(e => (
                    <div key={e.event} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{e.event}</code>
                      <span className="text-sm text-muted-foreground">{e.desc}</span>
                    </div>
                  ))}
                </div>

                <h3 className="font-semibold mt-4">Formato do Payload</h3>
                <CodeBlock language="json">{`{
  "event": "empresa.created",
  "timestamp": "2026-02-11T12:00:00Z",
  "data": {
    "cnpj": "00000000000191",
    "razao_social": "EMPRESA EXEMPLO LTDA",
    ...
  }
}`}</CodeBlock>

                <h3 className="font-semibold mt-4">Verificação de Assinatura</h3>
                <p className="text-sm text-muted-foreground">
                  Cada webhook inclui um header <code className="bg-muted px-1 rounded">X-Webhook-Signature</code> com 
                  um HMAC-SHA256 do payload usando seu webhook secret. Verifique esta assinatura para garantir autenticidade.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integracoes" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-500" /> n8n
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Configure um nó HTTP Request no n8n para consultar a API:
                  </p>
                  <CodeBlock>{`Método: GET
URL: ${baseUrl}/empresas?uf=SP

Headers:
  x-api-key: lb_sua_chave_aqui

Response: JSON`}</CodeBlock>
                  <p className="text-sm text-muted-foreground">
                    Para receber eventos, crie um Webhook Trigger no n8n e registre a URL gerada como webhook no painel admin.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" /> Typebot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No Typebot, use o bloco "HTTP Request" para consultar dados de empresas:
                  </p>
                  <CodeBlock>{`Bloco: HTTP Request
URL: ${baseUrl}/empresas?cnpj={{variavel_cnpj}}

Headers:
  x-api-key: lb_sua_chave_aqui

Salvar resposta em: {{dados_empresa}}`}</CodeBlock>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-green-500" /> JavaScript / Node.js
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock language="javascript">{`const response = await fetch(
  '${baseUrl}/empresas?uf=SP&limit=10',
  {
    headers: {
      'x-api-key': process.env.LEADSBASE_API_KEY
    }
  }
);

const { data, pagination } = await response.json();
console.log(\`Total: \${pagination.total} empresas\`);`}</CodeBlock>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-yellow-500" /> Python
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock language="python">{`import requests

response = requests.get(
    '${baseUrl}/empresas',
    params={'uf': 'SP', 'limit': 10},
    headers={'x-api-key': 'lb_sua_chave'}
)

data = response.json()
print(f"Total: {data['pagination']['total']}")`}</CodeBlock>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ApiIntegracoes;
