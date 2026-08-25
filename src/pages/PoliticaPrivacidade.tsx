import { MainLayout } from '@/components/layout/MainLayout';

const PoliticaPrivacidade = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Política de Privacidade</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. Introdução</h2>
              <p>
                O LeadsBase Pro está comprometido com a proteção da privacidade de seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. Dados que Coletamos</h2>
              <p>Podemos coletar os seguintes tipos de informações:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone e informações de empresa</li>
                <li><strong>Dados de uso:</strong> histórico de consultas, preferências e interações com a plataforma</li>
                <li><strong>Dados de pagamento:</strong> informações necessárias para processamento de transações</li>
                <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, dispositivo e cookies</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. Finalidade do Tratamento</h2>
              <p>Utilizamos seus dados para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fornecer e melhorar nossos serviços</li>
                <li>Processar pagamentos e gerenciar sua conta</li>
                <li>Enviar comunicações sobre o serviço</li>
                <li>Garantir a segurança da plataforma</li>
                <li>Cumprir obrigações legais e regulatórias</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Base Legal</h2>
              <p>O tratamento de dados pessoais é realizado com base em:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Execução de contrato de prestação de serviços</li>
                <li>Consentimento do titular</li>
                <li>Cumprimento de obrigação legal</li>
                <li>Legítimo interesse do controlador</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. Compartilhamento de Dados</h2>
              <p>
                Seus dados podem ser compartilhados com:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Processadores de pagamento para transações financeiras</li>
                <li>Prestadores de serviços essenciais à operação da plataforma</li>
                <li>Autoridades competentes quando exigido por lei</li>
              </ul>
              <p>
                Não vendemos ou alugamos seus dados pessoais a terceiros para fins de marketing.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">6. Segurança dos Dados</h2>
              <p>
                Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Criptografia de dados em trânsito e em repouso</li>
                <li>Controle de acesso restrito</li>
                <li>Monitoramento contínuo de segurança</li>
                <li>Backups regulares</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Retenção de Dados</h2>
              <p>
                Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas nesta política, ou conforme exigido por lei. Após esse período, os dados serão anonimizados ou excluídos de forma segura.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">8. Seus Direitos (LGPD)</h2>
              <p>Conforme a LGPD, você tem direito a:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Confirmar a existência de tratamento de dados</li>
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos ou desatualizados</li>
                <li>Solicitar anonimização, bloqueio ou eliminação de dados</li>
                <li>Solicitar portabilidade dos dados</li>
                <li>Revogar consentimento a qualquer momento</li>
                <li>Obter informações sobre compartilhamento de dados</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">9. Cookies</h2>
              <p>
                Utilizamos cookies para melhorar sua experiência na plataforma. Você pode gerenciar suas preferências de cookies através das configurações do seu navegador.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">10. Alterações nesta Política</h2>
              <p>
                Podemos atualizar esta política periodicamente. Notificaremos sobre alterações significativas por e-mail ou através de aviso na plataforma.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">11. Contato do Encarregado (DPO)</h2>
              <p>
                Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato conosco através da nossa página de contato.
              </p>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PoliticaPrivacidade;
