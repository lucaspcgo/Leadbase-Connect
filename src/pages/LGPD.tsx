import { MainLayout } from '@/components/layout/MainLayout';
import { Shield, Lock, Eye, UserCheck, FileText, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const LGPD = () => {
  const direitos = [
    {
      icon: Eye,
      titulo: "Acesso aos Dados",
      descricao: "Você pode solicitar informações sobre quais dados pessoais seus estão sendo tratados."
    },
    {
      icon: FileText,
      titulo: "Correção de Dados",
      descricao: "Solicite a correção de dados pessoais incompletos, inexatos ou desatualizados."
    },
    {
      icon: Lock,
      titulo: "Eliminação de Dados",
      descricao: "Peça a exclusão de dados pessoais tratados com base no seu consentimento."
    },
    {
      icon: UserCheck,
      titulo: "Portabilidade",
      descricao: "Solicite a transferência de seus dados pessoais para outro fornecedor de serviço."
    }
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-6">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-4">LGPD - Lei Geral de Proteção de Dados</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              O LeadsBase Pro está comprometido com a proteção dos seus dados pessoais e em conformidade com a Lei nº 13.709/2018.
            </p>
          </div>

          {/* O que é a LGPD */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">O que é a LGPD?</h2>
            <div className="bg-muted/50 rounded-lg p-6">
              <p className="mb-4">
                A Lei Geral de Proteção de Dados (LGPD) é a legislação brasileira que regulamenta o tratamento de dados pessoais por empresas e organizações. Ela estabelece regras claras sobre coleta, armazenamento, tratamento e compartilhamento de dados pessoais.
              </p>
              <p>
                A LGPD garante aos cidadãos maior controle sobre seus dados pessoais e impõe obrigações às empresas para garantir a segurança e privacidade dessas informações.
              </p>
            </div>
          </section>

          {/* Seus Direitos */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Seus Direitos como Titular</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {direitos.map((direito, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <direito.icon className="h-5 w-5 text-primary" />
                      {direito.titulo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {direito.descricao}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Direitos Completos */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Direitos Garantidos pela LGPD</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-medium">Confirmação e Acesso</h3>
                <p className="text-muted-foreground text-sm">Confirmar se seus dados são tratados e acessar uma cópia deles.</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-medium">Correção</h3>
                <p className="text-muted-foreground text-sm">Corrigir dados incompletos, inexatos ou desatualizados.</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-medium">Anonimização, Bloqueio ou Eliminação</h3>
                <p className="text-muted-foreground text-sm">Solicitar tratamento de dados desnecessários ou excessivos.</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-medium">Portabilidade</h3>
                <p className="text-muted-foreground text-sm">Transferir seus dados para outro fornecedor de serviço.</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-medium">Eliminação</h3>
                <p className="text-muted-foreground text-sm">Excluir dados tratados com consentimento.</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-medium">Informação sobre Compartilhamento</h3>
                <p className="text-muted-foreground text-sm">Saber com quais entidades seus dados são compartilhados.</p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-medium">Revogação do Consentimento</h3>
                <p className="text-muted-foreground text-sm">Revogar consentimento dado anteriormente.</p>
              </div>
            </div>
          </section>

          {/* Nosso Compromisso */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Nosso Compromisso</h2>
            <div className="bg-primary/5 rounded-lg p-6 space-y-4">
              <p>
                <strong>Transparência:</strong> Informamos claramente como seus dados são coletados e utilizados.
              </p>
              <p>
                <strong>Segurança:</strong> Implementamos medidas técnicas e organizacionais para proteger seus dados.
              </p>
              <p>
                <strong>Finalidade:</strong> Utilizamos seus dados apenas para os fins informados.
              </p>
              <p>
                <strong>Minimização:</strong> Coletamos apenas os dados necessários para nossos serviços.
              </p>
            </div>
          </section>

          {/* Links e Contato */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Documentos e Contato</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-2">Documentos Importantes</h3>
                  <div className="space-y-2">
                    <Link to="/termos" className="text-primary hover:underline block">
                      → Termos de Uso
                    </Link>
                    <Link to="/privacidade" className="text-primary hover:underline block">
                      → Política de Privacidade
                    </Link>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-2">Exercer seus Direitos</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Para exercer qualquer um dos seus direitos, entre em contato conosco.
                  </p>
                  <Button asChild>
                    <Link to="/contato">
                      <Mail className="h-4 w-4 mr-2" />
                      Fale Conosco
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
};

export default LGPD;
