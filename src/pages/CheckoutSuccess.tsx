import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  const sessionId = searchParams.get('session_id');
  const paymentId = searchParams.get('payment_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !paymentId) {
        setStatus('error');
        setErrorMessage('Parâmetros de verificação ausentes');
        return;
      }

      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) {
          setStatus('error');
          setErrorMessage('Sessão expirada. Por favor, faça login novamente.');
          return;
        }

        const response = await supabase.functions.invoke('verify-stripe-payment', {
          body: { session_id: sessionId, payment_id: paymentId },
        });

        if (response.error) {
          console.error('Verification error:', response.error);
          setStatus('error');
          setErrorMessage(response.error.message || 'Erro ao verificar pagamento');
          return;
        }

        const data = response.data;

        if (data?.is_paid) {
          setStatus('success');
          await refreshUser();
          toast({
            title: 'Pagamento confirmado!',
            description: 'Seu plano foi ativado com sucesso.',
          });
        } else {
          // Payment still pending, might be processing
          setStatus('success');
          toast({
            title: 'Pagamento em processamento',
            description: 'Seu pagamento está sendo processado. O plano será ativado em breve.',
          });
        }
      } catch (err) {
        console.error('Error verifying payment:', err);
        setStatus('error');
        setErrorMessage('Erro ao verificar pagamento');
      }
    };

    verifyPayment();
  }, [sessionId, paymentId, refreshUser, toast]);

  return (
    <MainLayout>
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            {status === 'verifying' ? (
              <>
                <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <CardTitle className="text-2xl">Verificando Pagamento</CardTitle>
                <CardDescription>
                  Aguarde enquanto verificamos seu pagamento...
                </CardDescription>
              </>
            ) : status === 'success' ? (
              <>
                <div className="mx-auto w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <CardTitle className="text-2xl text-success">Pagamento Confirmado!</CardTitle>
                <CardDescription>
                  Seu plano foi ativado com sucesso. Você já pode começar a usar todos os recursos.
                </CardDescription>
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl text-destructive">Erro na Verificação</CardTitle>
                <CardDescription>
                  {errorMessage || 'Não foi possível verificar seu pagamento.'}
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {status !== 'verifying' && (
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/dashboard')}>
                  Ir para Dashboard
                </Button>
                {status === 'error' && (
                  <Button variant="outline" onClick={() => navigate('/precos')}>
                    Ver Planos
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default CheckoutSuccess;
