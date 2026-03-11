import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Car, Menu, X, User, LogOut, Heart, Map, Calendar, Home } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import ThemeToggle from '../../components/theme-toggle';
import { cn } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('[Header] Erro no logout:', error);
    }
  };

  const navLinkClasses = (path, exact = false) => {
    const isActive = exact 
      ? location.pathname === path 
      : location.pathname.includes(path);
    
    return cn(
      "relative flex items-center gap-1.5 text-sm font-medium transition-all duration-300 px-3 py-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
      isActive 
        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" 
        : "text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
    );
  };

  return (
    <header className="fixed top-0 w-full z-50 glass border-b border-white/20 transition-all duration-300 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <Link to="/client/dashboard" aria-label="Home DrivePluss" className="flex items-center space-x-2 group focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg outline-none mr-4">
            <div className="bg-blue-600 rounded-lg p-1.5 shadow-lg group-hover:scale-105 transition-transform duration-300 hover-glow">
              <Car className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white font-display tracking-tight hidden sm:block">
              Drive<span className="text-blue-600">Pluss</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-1 flex-1 justify-center" aria-label="Main Navigation">
             <Link to="/agendamento/novo" className={navLinkClasses("/agendamento")}>
               <Calendar className="w-4 h-4" aria-hidden="true" />
               Agenda de Oficina
             </Link>
             
             <Link to="/workshops/map" className={navLinkClasses("/workshops")}>
               <Map className="w-4 h-4" aria-hidden="true" />
               Encontrar Oficinas
             </Link>

             {isAuthenticated && (
               <Link to="/client/dashboard" className={navLinkClasses("/client/dashboard")}>
                 Dashboard
               </Link>
             )}
          </nav>

          <div className="hidden md:flex items-center space-x-3 ml-4">
            <ThemeToggle />

            {isAuthenticated ? (
              <>
                <Link to="/favorites" aria-label="Favoritos">
                  <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors">
                    <Heart className="w-5 h-5" aria-hidden="true" />
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" aria-label="Menu do Usuário" className="flex items-center space-x-2 pl-2 pr-4 rounded-full border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all focus-visible:ring-2 focus-visible:ring-blue-500">
                      <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                        {user?.name?.charAt(0) || <User className="w-4 h-4" aria-hidden="true" />}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {user?.name?.split(' ')[0] || 'Usuário'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-bold">{user?.name || 'Usuário'}</span>
                        <span className="text-xs text-gray-500">{user?.email || 'email@exemplo.com'}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/client/dashboard" className="cursor-pointer">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/client/appointments" className="cursor-pointer">Meus Agendamentos</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/client/profile" className="cursor-pointer">Meu Perfil</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-600">
                      <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="ghost" className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all hover:scale-105">
                    Criar Conta
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="flex md:hidden items-center space-x-2">
             <ThemeToggle />
             <Button variant="ghost" size="icon" aria-label="Abrir Menu" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
             </Button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden glass border-t border-gray-200 dark:border-gray-800 animate-slide-up">
           <nav className="flex flex-col px-4 py-4 space-y-1" aria-label="Mobile Navigation">
              <Link 
                to="/" 
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors",
                  location.pathname === "/" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-700 dark:text-gray-200"
                )} 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-5 h-5" /> Início
              </Link>
              <Link 
                to="/agendamento/novo" 
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors",
                  location.pathname.includes("/agendamento") ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-700 dark:text-gray-200"
                )} 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Calendar className="w-5 h-5" /> Agenda de Oficina
              </Link>
              <Link 
                to="/workshops/map" 
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors",
                  location.pathname.includes("/workshops") ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-700 dark:text-gray-200"
                )} 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Map className="w-5 h-5" /> Encontrar Oficinas
              </Link>
              
              {isAuthenticated ? (
                <>
                   <Link to="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                   <Link to="/cliente/agendamentos" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200" onClick={() => setIsMobileMenuOpen(false)}>Meus Agendamentos</Link>
                   <Link to="/profile" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200" onClick={() => setIsMobileMenuOpen(false)}>Meu Perfil</Link>
                   <button 
                     className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-red-600 dark:text-red-400 text-left"
                     onClick={() => {
                       handleLogout();
                       setIsMobileMenuOpen(false);
                     }}
                   >
                     <LogOut className="w-5 h-5" aria-hidden="true" /> Sair
                   </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-4 px-2">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Login</Button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-blue-600 text-white">Cadastrar</Button>
                  </Link>
                </div>
              )}
           </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
