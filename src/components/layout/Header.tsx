import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Database, Search, CreditCard, Settings, LogOut, User, Shield, Coins, Menu, X, Home, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';
export const Header = () => {
  const {
    user,
    isAuthenticated,
    isAdmin,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  return <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Database className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">LeadsBase<span className="text-primary">Pro</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {isAuthenticated ? <>
              <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link to="/buscar" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <Search className="inline-block w-4 h-4 mr-1" />
                Buscar Empresas
              </Link>
              <Link to="/creditos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <Coins className="inline-block w-4 h-4 mr-1" />
                Créditos
              </Link>
              {isAdmin && <Link to="/admin" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  <Shield className="inline-block w-4 h-4 mr-1" />
                  Admin
                </Link>}
            </> : <>
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <Home className="inline-block w-4 h-4 mr-1" />
                Início
              </Link>
              <Link to="/precos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Preços
              </Link>
              <Link to="/sobre" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Sobre
              </Link>
              <Link to="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Blog
              </Link>
              <Link to="/contato" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Contato
              </Link>
            </>}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Offline Indicator */}
          {!isOnline && (
            <Badge variant="destructive" className="hidden sm:flex items-center gap-1 px-2 py-1">
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </Badge>
          )}
          
          {isAuthenticated ? <>
              {/* Extra Credits Badge */}
              <Badge variant="secondary" className="hidden sm:flex gap-1 px-3 py-1">
                <Coins className="h-3.5 w-3.5" />
                <span className="font-semibold">{user?.extraCredits || 0}</span>
                <span className="text-muted-foreground">extras</span>
              </Badge>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.name ? getInitials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <User className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/creditos')}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Comprar Créditos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/historico')}>
                    <Search className="mr-2 h-4 w-4" />
                    Histórico
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </> : <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Entrar
              </Button>
              <Button onClick={() => navigate('/cadastro')}>
                Começar Grátis
              </Button>
            </div>}

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && <div className="md:hidden border-t bg-card animate-fade-in">
          <nav className="container py-4 flex flex-col gap-2">
            {isAuthenticated ? <>
                <Link to="/dashboard" className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                  Dashboard
                </Link>
                <Link to="/buscar" className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                  Buscar Empresas
                </Link>
                <Link to="/creditos" className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                  Créditos
                </Link>
                {isAdmin && <Link to="/admin" className="px-4 py-2 text-sm font-medium text-primary rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                    Painel Admin
                  </Link>}
                <Button variant="ghost" className="justify-start text-destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </> : <>
                <Link to="/" className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                  Início
                </Link>
                <Link to="/precos" className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                  Preços
                </Link>
                <Link to="/sobre" className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                  Sobre
                </Link>
                <Link to="/blog" className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                  Blog
                </Link>
                <Link to="/contato" className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                  Contato
                </Link>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => navigate('/login')}>
                    Entrar
                  </Button>
                  <Button className="flex-1" onClick={() => navigate('/cadastro')}>
                    Cadastrar
                  </Button>
                </div>
              </>}
          </nav>
        </div>}
    </header>;
};