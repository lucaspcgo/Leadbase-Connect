import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckout } from '@/hooks/useCheckout';
import { useActivePlans } from '@/hooks/usePlans';
import { usePublicPaymentConfig } from '@/hooks/usePublicPaymentConfig';
import { useGA4Events } from '@/hooks/useGA4Events';
import { useMetaPixelEvents } from '@/hooks/useMetaPixelEvents';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { useFirstPurchaseCoupon } from '@/hooks/useFirstPurchaseCoupon';
import { creditPackages } from '@/data/mockData';
import { BillingCycle, PaymentMethod } from '@/types/payment';
import { CreditCard, QrCode, Check, Copy, Loader2, Shield, Clock, CheckCircle2, Coins, RefreshCw, AlertCircle, AlertTriangle, Ticket, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAYMENT_CHECK_INTERVAL = 5000; // 5 seconds
const PAYMENT_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const MINIMUM_DAYS_BEFORE_CANCEL = 90; // 90 days minimum subscription period

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    user,
    isAuthenticated,
    isTeamMember,
    refreshUser
  } = useAuth();
  const {
    createCheckout,
    checkPaymentStatus,
    loading: checkoutLoading
  } = useCheckout();
  const {
    plans,
    loading: plansLoading
  } = useActivePlans();
  const {
    config: publicPaymentConfig,
    loading: paymentConfigLoading
  } = usePublicPaymentConfig();
  const { trackConversion, trackPurchase, trackPlanUpgrade } = useGA4Events();
  const { trackPurchase: trackPixelPurchase, trackInitiateCheckout } = useMetaPixelEvents();
  const { validating, appliedCoupon, validateCoupon, calculateDiscount, clearCoupon, incrementCouponUsage } = useValidateCoupon();
  const { checkEligibility, couponCode: firstPurchaseCouponCode, discountPercentage: firstPurchaseDiscount } = useFirstPurchaseCoupon();
  const [firstPurchaseEligible, setFirstPurchaseEligible] = useState(false);
  const [checkedFirstPurchase, setCheckedFirstPurchase] = useState(false);
  // Get data from location state (from Creditos page) or search params
  const stateData = location.state as {
    type?: 'credits' | 'plan';
    packageId?: string;
    credits?: number;
    price?: number;
    planId?: string;
    planName?: string;
  } | null;
  const isCreditsCheckout = stateData?.type === 'credits';
  const creditPackage = isCreditsCheckout ? creditPackages.find(p => p.id === stateData?.packageId) : null;
  const planId = stateData?.planId || searchParams.get('plan') || 'basic';
  const cycleParam = searchParams.get('cycle') as BillingCycle || 'MONTHLY';
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(cycleParam);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('STRIPE');
  const [payerName, setPayerName] = useState(user?.name || '');
  const [payerEmail, setPayerEmail] = useState(user?.email || '');
  const [payerDocument, setPayerDocument] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  // Payment state
  const [checkoutResult, setCheckoutResult] = useState<{
    paymentId: string;
    pixCode: string;
    pixQrCode: string;
    amount: number;
    dueDate: Date;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'failed' | 'expired'>('pending');
  const [timeRemaining, setTimeRemaining] = useState<number>(PAYMENT_TIMEOUT);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const paymentCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paymentMethodInitializedRef = useRef(false);
  
  // State for 90-day terms dialog (only for subscription purchases)
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Find plan from database plans
  const plan = plans.find(p => p.id === planId) || plans[0];
  const planPrice = plan ? billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly : 0;
  const basePrice = isCreditsCheckout ? stateData?.price || 0 : planPrice;
  const discount = appliedCoupon ? calculateDiscount(basePrice) : 0;
  const price = Math.max(0, basePrice - discount);
  const savings = !isCreditsCheckout && plan && billingCycle === 'YEARLY' ? plan.priceMonthly * 12 - plan.priceYearly : 0;
  useEffect(() => {
    if (user) {
      setPayerName(user.name);
      setPayerEmail(user.email);
    }
  }, [user]);

  // Set default payment method based on what's enabled (only once)
  useEffect(() => {
    if (!paymentConfigLoading && !paymentMethodInitializedRef.current) {
      paymentMethodInitializedRef.current = true;
      if (publicPaymentConfig.stripe_enabled) {
        setPaymentMethod('STRIPE');
      } else if (publicPaymentConfig.mercado_pago_enabled) {
        setPaymentMethod('MERCADO_PAGO');
      }
    }
  }, [paymentConfigLoading, publicPaymentConfig]);

  // Check for first purchase coupon eligibility
  useEffect(() => {
    const checkFirstPurchase = async () => {
      if (!isCreditsCheckout && user && !checkedFirstPurchase) {
        setCheckedFirstPurchase(true);
        const result = await checkEligibility();
        if (result.coupon && !result.alreadyUsed) {
          setFirstPurchaseEligible(true);
        }
      }
    };
    checkFirstPurchase();
  }, [user, isCreditsCheckout, checkEligibility, checkedFirstPurchase]);

  // Sub-accounts should not manage billing actions
  useEffect(() => {
    if (isAuthenticated && isTeamMember) {
      toast({
        title: 'Ação não permitida',
        description: 'Você está usando uma subconta. Apenas o titular do plano pode contratar/alterar a assinatura ou comprar créditos.',
        variant: 'destructive'
      });
      navigate('/dashboard');
    }
  }, [isAuthenticated, isTeamMember, navigate, toast]);

  // Start payment verification polling
  const startPaymentPolling = useCallback((paymentId: string) => {
    // Clear any existing intervals
    if (paymentCheckIntervalRef.current) {
      clearInterval(paymentCheckIntervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Start countdown timer
    const startTime = Date.now();
    const countdownInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, PAYMENT_TIMEOUT - elapsed);
      setTimeRemaining(remaining);
      if (remaining === 0) {
        setPaymentStatus('expired');
        clearInterval(countdownInterval);
      }
    }, 1000);

    // Set timeout for expiration
    timeoutRef.current = setTimeout(() => {
      setPaymentStatus('expired');
      if (paymentCheckIntervalRef.current) {
        clearInterval(paymentCheckIntervalRef.current);
      }
    }, PAYMENT_TIMEOUT);

    // Start polling for payment status
    paymentCheckIntervalRef.current = setInterval(async () => {
      setIsCheckingPayment(true);
      const status = await checkPaymentStatus(paymentId);
      setIsCheckingPayment(false);
      if (status) {
        if (status.status === 'APPROVED') {
          setPaymentStatus('approved');
          clearInterval(paymentCheckIntervalRef.current!);
          clearInterval(countdownInterval);
          clearTimeout(timeoutRef.current!);

          // Track conversion and purchase events
          if (isCreditsCheckout) {
            trackConversion('credit_purchase', stateData?.price || 0);
            trackPixelPurchase(stateData?.price || 0, {
              content_name: 'Créditos extras',
              content_type: 'credits',
            });
          } else if (plan) {
            trackPurchase(plan.name, planPrice);
            trackPlanUpgrade(plan.name);
            trackPixelPurchase(planPrice, {
              content_name: plan.name,
              content_type: 'plan',
            });
          }

          // Refresh user data to get the updated plan
          await refreshUser();
          toast({
            title: 'Pagamento confirmado!',
            description: 'Seu plano foi ativado com sucesso.'
          });
        } else if (status.status === 'FAILED' || status.status === 'CANCELLED') {
          setPaymentStatus('failed');
          clearInterval(paymentCheckIntervalRef.current!);
          clearInterval(countdownInterval);
          clearTimeout(timeoutRef.current!);
        }
      }
    }, PAYMENT_CHECK_INTERVAL);
    return () => {
      clearInterval(paymentCheckIntervalRef.current!);
      clearInterval(countdownInterval);
      clearTimeout(timeoutRef.current!);
    };
  }, [checkPaymentStatus, toast, refreshUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckIntervalRef.current) {
        clearInterval(paymentCheckIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  // Handler to initiate payment (called after terms accepted for subscriptions)
  const processPayment = async () => {
    if (!payerName || !payerEmail || !payerDocument || !payerPhone) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }
    if (!plan) {
      toast({
        title: 'Erro',
        description: 'Plano não encontrado.',
        variant: 'destructive'
      });
      return;
    }
    setIsProcessing(true);
    try {
      const result = await createCheckout({
        plan_id: plan.id,
        plan_name: plan.name,
        plan_price: price, // Use discounted price
        billing_cycle: billingCycle,
        payer_name: payerName,
        payer_email: payerEmail,
        payer_document: payerDocument,
        payment_method: paymentMethod
      });
      
      // Increment coupon usage if payment was created
      if (result && appliedCoupon) {
        await incrementCouponUsage(appliedCoupon.id, {
          userEmail: payerEmail,
          discountAmount: discount,
          originalAmount: basePrice,
          paymentId: result.paymentId,
        });
      }
      if (result) {
        setCheckoutResult({
          paymentId: result.paymentId,
          pixCode: result.pixCode,
          pixQrCode: result.pixQrCode,
          amount: result.amount,
          dueDate: result.dueDate
        });
        setPaymentStatus('pending');
        setTimeRemaining(PAYMENT_TIMEOUT);

        // Meta Pixel: início do checkout
        trackInitiateCheckout(result.amount || planPrice || 0, {
          content_name: isCreditsCheckout ? 'Créditos extras' : plan?.name,
        });

        // Start polling for payment status
        startPaymentPolling(result.paymentId);
        toast({
          title: 'Pedido criado!',
          description: 'Aguardando confirmação do pagamento.'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível processar o pedido.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Main form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For subscription purchases (not credits), show terms dialog first
    if (!isCreditsCheckout && !termsAccepted) {
      // Validate required fields first
      if (!payerName || !payerEmail || !payerDocument || !payerPhone) {
        toast({
          title: 'Erro',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive'
        });
        return;
      }
      setShowTermsDialog(true);
      return;
    }
    
    // For credits or if terms already accepted, proceed with payment
    await processPayment();
  };
  
  // Handle terms acceptance and proceed with payment
  const handleAcceptTerms = async () => {
    setTermsAccepted(true);
    setShowTermsDialog(false);
    await processPayment();
  };
  const copyPixCode = () => {
    if (checkoutResult?.pixCode) {
      navigator.clipboard.writeText(checkoutResult.pixCode);
      toast({
        title: 'Copiado!',
        description: 'Código PIX copiado para a área de transferência.'
      });
    }
  };
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor(ms % 60000 / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Loading state while plans or payment config are being fetched
  if (plansLoading || paymentConfigLoading) {
    return <MainLayout>
        <div className="container max-w-4xl py-12">
          <h1 className="text-3xl font-bold mb-8 text-center">Carregando...</h1>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="md:col-span-1">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>;
  }

  // If plan not found after loading
  if (!plan && !isCreditsCheckout) {
    return <MainLayout>
        <div className="container max-w-2xl py-12 text-center">
          <Card>
            <CardContent className="py-12">
              <h2 className="text-2xl font-bold mb-4">Plano não encontrado</h2>
              <p className="text-muted-foreground mb-6">
                O plano selecionado não está disponível.
              </p>
              <Button onClick={() => navigate('/precos')}>
                Ver planos disponíveis
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>;
  }

  // Payment awaiting confirmation screen
  if (checkoutResult) {
    return <MainLayout>
        <div className="container max-w-2xl py-12">
          <Card>
            <CardHeader className="text-center">
              {paymentStatus === 'approved' ? <>
                  <div className="mx-auto w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <CardTitle className="text-2xl text-success">Pagamento Confirmado!</CardTitle>
                  <CardDescription>
                    Seu plano foi ativado com sucesso.
                  </CardDescription>
                </> : paymentStatus === 'expired' ? <>
                  <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <CardTitle className="text-2xl text-destructive">Tempo Expirado</CardTitle>
                  <CardDescription>
                    O tempo para pagamento expirou. Por favor, tente novamente.
                  </CardDescription>
                </> : paymentStatus === 'failed' ? <>
                  <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <CardTitle className="text-2xl text-destructive">Pagamento Falhou</CardTitle>
                  <CardDescription>
                    Houve um problema com o pagamento. Por favor, tente novamente.
                  </CardDescription>
                </> : <>
                  <div className="mx-auto w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-warning animate-pulse" />
                  </div>
                  <CardTitle className="text-2xl">Aguardando Pagamento</CardTitle>
                  <CardDescription>
                    Escaneie o QR Code ou copie o código PIX para realizar o pagamento.
                  </CardDescription>
                </>}
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Order Summary */}
              <div className="bg-muted rounded-lg p-4">
                {isCreditsCheckout ? <>
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Produto</span>
                      <span className="font-medium">Créditos Extras</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Quantidade</span>
                      <span className="font-medium">{stateData?.credits} créditos</span>
                    </div>
                  </> : <>
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Plano</span>
                      <span className="font-medium">{plan?.name}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Ciclo</span>
                      <span className="font-medium">{billingCycle === 'YEARLY' ? 'Anual' : 'Mensal'}</span>
                    </div>
                  </>}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold text-lg">R$ {checkoutResult.amount.toLocaleString()}</span>
                </div>
              </div>
              
              {/* PIX Payment Details - Mercado Pago */}
              {paymentMethod === 'MERCADO_PAGO' && paymentStatus === 'pending' && <div className="space-y-4">
                  {/* Timer */}
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">Tempo restante para pagamento:</div>
                    <div className="text-3xl font-mono font-bold text-warning">
                      {formatTime(timeRemaining)}
                    </div>
                    <Progress value={timeRemaining / PAYMENT_TIMEOUT * 100} className="mt-2 h-2" />
                  </div>
                  
                  {/* QR Code */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Escaneie o QR Code com o app do seu banco:
                    </p>
                    
                    {checkoutResult.pixQrCode ? <div className="w-64 h-64 mx-auto bg-white rounded-lg flex items-center justify-center mb-4 border-2 p-2">
                        <img src={checkoutResult.pixQrCode} alt="QR Code PIX" className="w-full h-full object-contain" />
                      </div> : checkoutResult.pixCode ? <div className="w-64 h-64 mx-auto bg-white rounded-lg flex items-center justify-center mb-4 border-2 p-2">
                        <QrCode className="h-24 w-24 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground mt-2">Use o código abaixo</p>
                      </div> : <div className="w-64 h-64 mx-auto bg-destructive/10 rounded-lg flex flex-col items-center justify-center mb-4 border-2 border-dashed border-destructive/30">
                        <AlertCircle className="h-16 w-16 text-destructive/50 mb-2" />
                        <p className="text-sm text-destructive/70 text-center px-4">
                          Não foi possível gerar o QR Code. Tente novamente.
                        </p>
                      </div>}
                  </div>
                  
                  {/* PIX Code */}
                  {checkoutResult.pixCode ? <div className="space-y-2">
                      <Label>PIX Copia e Cola</Label>
                      <div className="flex gap-2">
                        <Input value={checkoutResult.pixCode} readOnly className="font-mono text-xs" />
                        <Button variant="outline" onClick={copyPixCode}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div> : <div className="text-center">
                      <Button variant="outline" onClick={() => {
                  setCheckoutResult(null);
                  setPaymentStatus('pending');
                }}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tentar Novamente
                      </Button>
                    </div>}
                  
                  {/* Status indicator */}
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-primary/10 p-3 rounded-lg">
                    {isCheckingPayment ? <>
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        Verificando pagamento...
                      </> : <>
                        <Clock className="h-4 w-4 text-primary" />
                        Verificando automaticamente a cada 5 segundos
                      </>}
                  </div>
                </div>}
              
              {/* Action Buttons */}
              <div className="flex gap-4">
                {paymentStatus === 'approved' ? <Button className="flex-1" onClick={() => navigate('/dashboard')}>
                    Ir para Dashboard
                  </Button> : paymentStatus === 'expired' || paymentStatus === 'failed' ? <>
                    <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
                      Ir para Dashboard
                    </Button>
                    <Button className="flex-1" onClick={() => {
                  setCheckoutResult(null);
                  setPaymentStatus('pending');
                }}>
                      Tentar Novamente
                    </Button>
                  </> : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>;
  }
  return <MainLayout>
      <div className="container max-w-4xl py-12">
        <h1 className="text-3xl font-bold mb-8 text-center">
          {isCreditsCheckout ? 'Comprar Créditos' : 'Finalizar Assinatura'}
        </h1>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Order Summary */}
          <Card className="md:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCreditsCheckout ? <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg flex items-center gap-2">
                        <Coins className="h-5 w-5 text-primary" />
                        Créditos Extras
                      </span>
                      <Badge variant="secondary">{stateData?.credits} créditos</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Créditos para desbloquear empresas após atingir seu limite mensal
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">Benefícios:</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        Créditos nunca expiram
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        1 crédito = 1 empresa desbloqueada
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        Use quando precisar
                      </li>
                    </ul>
                  </div>
                </> : <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg">{plan?.name}</span>
                      <Badge>{plan?.monthlyCompanyLimit} empresas/mês</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan?.description}</p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Ciclo de cobrança</Label>
                    <RadioGroup value={billingCycle} onValueChange={v => setBillingCycle(v as BillingCycle)}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="MONTHLY" id="monthly" />
                        <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                          <div className="flex justify-between">
                            <span>Mensal</span>
                            <span className="font-semibold">R$ {plan?.priceMonthly}/mês</span>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer border-primary">
                        <RadioGroupItem value="YEARLY" id="yearly" />
                        <Label htmlFor="yearly" className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <div>
                              <span>Anual</span>
                              {savings > 0 && <Badge variant="secondary" className="ml-2 text-xs">
                                  Economize R$ {savings}
                                </Badge>}
                            </div>
                            <span className="font-semibold">R$ {plan?.priceYearly}/ano</span>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Incluso no plano:</p>
                    <ul className="space-y-1">
                      {plan?.features.map((feature, i) => <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <Check className="h-4 w-4 text-success" />
                          {feature}
                        </li>)}
                    </ul>
                  </div>
                </>}
              
              <Separator />
              
              {/* Coupon Section */}
              {!isCreditsCheckout && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    Cupom de Desconto
                  </Label>
                  
                  {/* First Purchase Coupon Suggestion */}
                  {firstPurchaseEligible && !appliedCoupon && !couponCode && (
                    <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-primary">🎉 Primeira compra?</p>
                          <p className="text-xs text-muted-foreground">
                            Use o código <span className="font-mono font-bold">{firstPurchaseCouponCode}</span> para {firstPurchaseDiscount}% de desconto!
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCouponCode(firstPurchaseCouponCode);
                            validateCoupon(firstPurchaseCouponCode, planId, basePrice);
                          }}
                        >
                          Usar
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 bg-success/10 border border-success/30 rounded-lg">
                      <div>
                        <span className="font-mono font-bold text-success">{appliedCoupon.code}</span>
                        <p className="text-sm text-success">
                          {appliedCoupon.discount_type === 'PERCENTAGE'
                            ? `-${appliedCoupon.discount_value}%`
                            : `-R$ ${appliedCoupon.discount_value.toFixed(2)}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { clearCoupon(); setCouponCode(''); }}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Digite o código"
                        className="font-mono uppercase"
                      />
                      <Button
                        variant="outline"
                        onClick={() => validateCoupon(couponCode, planId, basePrice)}
                        disabled={validating || !couponCode.trim()}
                      >
                        {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              <Separator />
              
              {/* Price Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>R$ {basePrice.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Desconto ({appliedCoupon?.code})</span>
                    <span>-R$ {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">R$ {price.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Checkout Form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Dados do Pagamento</CardTitle>
              <CardDescription>Preencha os dados para finalizar sua assinatura</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Payer Info */}
                <div className="space-y-4">
                  <h3 className="font-medium">Dados do Pagador</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input id="name" value={payerName} onChange={e => setPayerName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" value={payerEmail} onChange={e => setPayerEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="document">CPF/CNPJ *</Label>
                      <Input id="document" value={payerDocument} onChange={e => setPayerDocument(e.target.value)} placeholder="000.000.000-00" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input id="phone" type="tel" value={payerPhone} onChange={e => setPayerPhone(e.target.value)} placeholder="(00) 00000-0000" required />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Payment Method */}
                <div className="space-y-4">
                  <h3 className="font-medium">Método de Pagamento</h3>
                  
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    {/* Stripe */}
                    {publicPaymentConfig.stripe_enabled && (
                      <Label
                        htmlFor="stripe"
                        className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                          paymentMethod === 'STRIPE' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                      >
                        <RadioGroupItem value="STRIPE" id="stripe" />
                        <CreditCard className="h-8 w-8 text-[#635BFF]" />
                        <div className="flex-1">
                          <p className="font-medium">Cartão de Crédito</p>
                          <p className="text-sm text-muted-foreground">Visa, Mastercard, Amex e outros</p>
                        </div>
                        <Badge variant="outline" className="text-success border-success">
                          Seguro
                        </Badge>
                      </Label>
                    )}
                    
                    {/* Mercado Pago */}
                    {publicPaymentConfig.mercado_pago_enabled && (
                      <Label
                        htmlFor="mercado_pago"
                        className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                          paymentMethod === 'MERCADO_PAGO' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                      >
                        <RadioGroupItem value="MERCADO_PAGO" id="mercado_pago" />
                        <QrCode className="h-8 w-8 text-[#009ee3]" />
                        <div className="flex-1">
                          <p className="font-medium">PIX via Mercado Pago</p>
                          <p className="text-sm text-muted-foreground">Pagamento instantâneo</p>
                        </div>
                        <Badge variant="outline" className="text-success border-success">
                          Aprovação automática
                        </Badge>
                      </Label>
                    )}
                  </RadioGroup>
                  
                  {!publicPaymentConfig.stripe_enabled && !publicPaymentConfig.mercado_pago_enabled && (
                    <div className="text-center py-4 text-muted-foreground">
                      Método de pagamento não configurado. Entre em contato com o suporte.
                    </div>
                  )}
                </div>
                
                <Separator />
                
                {/* Security Info */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                  <Shield className="h-5 w-5 text-success" />
                  <span>Seus dados estão protegidos com criptografia de ponta a ponta.</span>
                </div>
                
                <Button type="submit" size="lg" className="w-full" disabled={isProcessing || checkoutLoading}>
                  {isProcessing || checkoutLoading ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </> : <>Pagar R$ {price.toLocaleString()}</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        {/* 90-day Terms Dialog for Subscriptions */}
        <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Período Mínimo de Assinatura
              </DialogTitle>
              <DialogDescription className="text-left space-y-3 pt-2">
                <p>
                  Ao contratar o plano <strong>{plan?.name}</strong>, você concorda com um 
                  <strong className="text-foreground"> período mínimo de {MINIMUM_DAYS_BEFORE_CANCEL} dias</strong> antes 
                  de poder cancelar sua assinatura.
                </p>
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm">
                  <p className="font-medium text-warning mb-1">Importante:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>O cancelamento só estará disponível após {MINIMUM_DAYS_BEFORE_CANCEL} dias da contratação</li>
                    <li>Durante este período, a cobrança será mantida normalmente</li>
                    <li>Após o período mínimo, você poderá cancelar a qualquer momento</li>
                  </ul>
                </div>
                <p className="text-sm">
                  Deseja continuar com a contratação?
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowTermsDialog(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleAcceptTerms} className="w-full sm:w-auto">
                Aceito os termos e quero continuar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>;
};
export default Checkout;