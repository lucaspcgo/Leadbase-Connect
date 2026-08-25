import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';
export const Footer = () => {
  return <footer className="border-t bg-card">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
                <Database className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                LeadsBase<span className="text-primary">Pro</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              A plataforma mais completa para prospecção B2B no Brasil. 
              Encontre leads qualificados e impulsione suas vendas.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Produto</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/precos" className="text-muted-foreground hover:text-foreground transition-colors">
                  Preços
                </Link>
              </li>
              <li>
                <Link to="/buscar" className="text-muted-foreground hover:text-foreground transition-colors">
                  Buscar Empresas
                </Link>
              </li>
              <li>
                <Link to="/api" className="text-muted-foreground hover:text-foreground transition-colors">
                  API
                </Link>
              </li>
              <li>
                <Link to="/integracoes" className="text-muted-foreground hover:text-foreground transition-colors">
                  Integrações
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/sobre" className="text-muted-foreground hover:text-foreground transition-colors">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/contato" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contato
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/carreiras" className="text-muted-foreground hover:text-foreground transition-colors">
                  Carreiras
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/termos" className="text-muted-foreground hover:text-foreground transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-muted-foreground hover:text-foreground transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/lgpd" className="text-muted-foreground hover:text-foreground transition-colors">
                  LGPD
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-muted-foreground hover:text-foreground transition-colors">
                  Política de Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} LeadsBase Pro. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            Feito pela Bs Soluções.     
          </p>
        </div>
      </div>
    </footer>;
};