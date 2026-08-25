import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useReferral } from "@/hooks/useReferral";
import { Database, Mail, Lock, User, ArrowLeft, Loader2, Eye, EyeOff, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMetaPixelEvents } from "@/hooks/useMetaPixelEvents";
import { Badge } from "@/components/ui/badge";

const Cadastro = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { storeReferralCode, getStoredReferralCode, processReferral } = useReferral();
  const { trackCompleteRegistration } = useMetaPixelEvents();

  // Capture referral code from URL on mount
  const refCode = searchParams.get('ref');
  const [hasReferral, setHasReferral] = useState(false);

  useEffect(() => {
    if (refCode) {
      storeReferralCode(refCode);
      setHasReferral(true);
    } else {
      // Check if there's a stored referral code
      const storedCode = getStoredReferralCode();
      setHasReferral(!!storedCode);
    }
  }, [refCode, storeReferralCode, getStoredReferralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter no mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const result = await register(email, password, name);

    if (result.success) {
      toast({ title: "Conta criada!", description: "Bem-vindo ao LeadsBase Pro!" });

      // Meta Pixel: cadastro concluído
      trackCompleteRegistration({ content_name: "Cadastro LeadsBase Pro" });
      
      // Process referral after successful registration
      // The user data should be available from the auth context after registration
      // We'll need to get the user ID from the session
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: session } = await supabase.auth.getSession();
        
        if (session?.session?.user) {
          await processReferral(session.session.user.id, email);
        }
      } catch (err) {
        console.error('Error processing referral:', err);
        // Don't block the flow if referral processing fails
      }
      
      setLoading(false);
      navigate("/dashboard");
    } else {
      setLoading(false);
      toast({
        title: "Erro",
        description: result.error || "Não foi possível criar a conta.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao início
        </Link>
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                <Database className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Criar conta grátis</CardTitle>
            <CardDescription>Comece a usar o LeadsBase Pro hoje</CardDescription>
            {hasReferral && (
              <Badge variant="secondary" className="mt-3 inline-flex items-center gap-1">
                <Gift className="h-3 w-3" />
                Você foi indicado por um parceiro!
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar conta grátis"
                )}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Já tem conta?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Fazer login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Cadastro;
