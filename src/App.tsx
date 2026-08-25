import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EmpresasProvider } from "@/contexts/EmpresasContext";
import { CreditProvider } from "@/contexts/CreditContext";
import { CategoriesTagsProvider } from "@/contexts/CategoriesTagsContext";
import { UsersProvider } from "@/contexts/UsersContext";
import { PaymentProvider } from "@/contexts/PaymentContext";
import GA4ScriptInjector from "@/components/GA4ScriptInjector";
import MetaPixelInjector from "@/components/MetaPixelInjector";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { AutoPushNotificationSetup } from "@/components/pwa/AutoPushNotificationSetup";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import Index from "./pages/Index";
import Login from "./pages/Login";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Cadastro from "./pages/Cadastro";
import Dashboard from "./pages/Dashboard";
import BuscarEmpresas from "./pages/BuscarEmpresas";
import Creditos from "./pages/Creditos";
import Admin from "./pages/Admin";
import Precos from "./pages/Precos";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Historico from "./pages/Historico";
import Configuracoes from "./pages/Configuracoes";
import SobreNos from "./pages/SobreNos";
import Contato from "./pages/Contato";
import Blog from "./pages/Blog";
import Carreiras from "./pages/Carreiras";
import ApiIntegracoes from "./pages/ApiIntegracoes";
import TermosDeUso from "./pages/TermosDeUso";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import LGPD from "./pages/LGPD";
import PoliticaCookies from "./pages/PoliticaCookies";
import Instalar from "./pages/Instalar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <UsersProvider>
          <CreditProvider>
            <PaymentProvider>
              <EmpresasProvider>
                <CategoriesTagsProvider>
                  <Toaster />
                  <Sonner />
                  <InstallPrompt />
                  <UpdatePrompt />
                  <BrowserRouter>
                    <InstallBanner />
                    <AutoPushNotificationSetup />
                    <GA4ScriptInjector />
                    <MetaPixelInjector />
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
                      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
                      <Route path="/cadastro" element={<Cadastro />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/buscar" element={<BuscarEmpresas />} />
                      <Route path="/creditos" element={<Creditos />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/checkout/success" element={<CheckoutSuccess />} />
                      <Route path="/historico" element={<Historico />} />
                      <Route path="/configuracoes" element={<Configuracoes />} />
                      <Route path="/sobre" element={<SobreNos />} />
                      <Route path="/contato" element={<Contato />} />
                      <Route path="/blog" element={<Blog />} />
                      <Route path="/carreiras" element={<Carreiras />} />
                      <Route path="/admin/*" element={<Admin />} />
                      <Route path="/precos" element={<Precos />} />
                      <Route path="/api" element={<ApiIntegracoes />} />
                      <Route path="/integracoes" element={<ApiIntegracoes />} />
                      <Route path="/api-integracoes" element={<ApiIntegracoes />} />
                      <Route path="/termos" element={<TermosDeUso />} />
                      <Route path="/privacidade" element={<PoliticaPrivacidade />} />
                      <Route path="/lgpd" element={<LGPD />} />
                      <Route path="/cookies" element={<PoliticaCookies />} />
                      <Route path="/instalar" element={<Instalar />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </CategoriesTagsProvider>
              </EmpresasProvider>
            </PaymentProvider>
          </CreditProvider>
        </UsersProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
