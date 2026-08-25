import { MainLayout } from '@/components/layout/MainLayout';

const TermosDeUso = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Termos de Uso</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. Aceitação dos Termos</h2>
              <p>
                Ao acessar e utilizar a plataforma LeadsBase Pro, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. Descrição do Serviço</h2>
              <p>
                O LeadsBase Pro é uma plataforma de consulta e análise de dados empresariais públicos, oferecendo acesso a informações cadastrais de empresas brasileiras para fins comerciais legítimos, como prospecção de clientes e análise de mercado.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. Cadastro e Conta</h2>
              <p>
                Para utilizar nossos serviços, você deve criar uma conta fornecendo informações verdadeiras, precisas e completas. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Uso Permitido</h2>
              <p>Você concorda em utilizar o LeadsBase Pro apenas para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Prospecção comercial legítima</li>
                <li>Análise de mercado e concorrência</li>
                <li>Verificação de dados cadastrais</li>
                <li>Outras finalidades comerciais lícitas</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. Uso Proibido</h2>
              <p>É expressamente proibido:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Utilizar os dados para práticas de spam ou assédio</li>
                <li>Revender ou redistribuir os dados obtidos na plataforma</li>
                <li>Utilizar métodos automatizados para extrair dados em massa</li>
                <li>Violar a privacidade ou direitos de terceiros</li>
                <li>Praticar qualquer atividade ilegal com os dados obtidos</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">6. Planos e Pagamentos</h2>
              <p>
                Os serviços são oferecidos em diferentes planos com limites de consultas mensais. Os pagamentos são processados de forma segura e os créditos são renovados conforme o ciclo de faturamento do plano contratado.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo da plataforma, incluindo mas não limitado a textos, gráficos, logos, ícones e software, é de propriedade do LeadsBase Pro e protegido por leis de propriedade intelectual.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">8. Limitação de Responsabilidade</h2>
              <p>
                O LeadsBase Pro fornece informações com base em dados públicos disponíveis. Não garantimos a precisão absoluta dos dados e não nos responsabilizamos por decisões tomadas com base nas informações fornecidas.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">9. Modificações dos Termos</h2>
              <p>
                Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação. O uso continuado da plataforma após as alterações constitui aceitação dos novos termos.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">10. Lei Aplicável</h2>
              <p>
                Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida nos tribunais competentes do Brasil.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">11. Contato</h2>
              <p>
                Para dúvidas sobre estes Termos de Uso, entre em contato conosco através da nossa página de contato.
              </p>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TermosDeUso;
