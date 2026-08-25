/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock all contexts
vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAdmin: false,
    isMasterAdmin: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/contexts/CreditContext", () => ({
  CreditProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCredits: () => ({
    credits: 0,
    extraCredits: 0,
    usedCredits: 0,
    monthlyLimit: 100,
    isLoading: false,
  }),
}));

vi.mock("@/contexts/EmpresasContext", () => ({
  EmpresasProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useEmpresas: () => ({
    empresas: [],
    isLoading: false,
  }),
}));

vi.mock("@/contexts/CategoriesTagsContext", () => ({
  CategoriesTagsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCategoriesTags: () => ({
    categories: [],
    tags: [],
    isLoading: false,
  }),
}));

vi.mock("@/contexts/UsersContext", () => ({
  UsersProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUsers: () => ({
    users: [],
    isLoading: false,
  }),
}));

vi.mock("@/contexts/PaymentContext", () => ({
  PaymentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePayment: () => ({
    paymentConfig: null,
    isLoading: false,
  }),
}));

// Mock supabase with complete chain methods
const createMockChain = () => {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    like: () => chain,
    ilike: () => chain,
    is: () => chain,
    in: () => chain,
    contains: () => chain,
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  return chain;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockImplementation(() => createMockChain()),
  },
}));

import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Cadastro from "@/pages/Cadastro";
import EsqueciSenha from "@/pages/EsqueciSenha";
import RedefinirSenha from "@/pages/RedefinirSenha";
import SobreNos from "@/pages/SobreNos";
import Contato from "@/pages/Contato";
import Blog from "@/pages/Blog";
import Carreiras from "@/pages/Carreiras";
import Precos from "@/pages/Precos";
import ApiIntegracoes from "@/pages/ApiIntegracoes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithRouter = (route: string, element: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("Routes - Páginas Públicas", () => {
  it("/ - Index não deve mostrar 404", () => {
    renderWithRouter("/", <Index />);
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("/login - Login não deve mostrar 404", () => {
    renderWithRouter("/login", <Login />);
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("/cadastro - Cadastro não deve mostrar 404", () => {
    renderWithRouter("/cadastro", <Cadastro />);
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("/esqueci-senha - EsqueciSenha não deve mostrar 404", () => {
    renderWithRouter("/esqueci-senha", <EsqueciSenha />);
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("/redefinir-senha - RedefinirSenha não deve mostrar 404", () => {
    renderWithRouter("/redefinir-senha", <RedefinirSenha />);
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("/sobre - SobreNos não deve mostrar 404", () => {
    renderWithRouter("/sobre", <SobreNos />);
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("/contato - Contato não deve mostrar 404", () => {
    renderWithRouter("/contato", <Contato />);
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("/blog - Blog não deve mostrar 404", () => {
    renderWithRouter("/blog", <Blog />);
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("/carreiras - Carreiras não deve mostrar 404", () => {
    renderWithRouter("/carreiras", <Carreiras />);
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("/precos - Precos não deve mostrar 404", () => {
    renderWithRouter("/precos", <Precos />);
    expect(screen.queryByText("404")).not.toBeInTheDocument();
  });

  it("/api-integracoes - ApiIntegracoes não deve mostrar 404", () => {
    renderWithRouter("/api-integracoes", <ApiIntegracoes />);
    expect(screen.queryByText("404")).not.toBeInTheDocument();
    expect(screen.getByText("Em desenvolvimento")).toBeInTheDocument();
  });
});

describe("Routes - Rota inexistente deve mostrar 404", () => {
  it("/rota-inexistente deve mostrar 404", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/rota-inexistente"]}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText("404")).toBeInTheDocument();
  });
});
