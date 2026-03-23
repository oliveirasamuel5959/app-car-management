import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Car, Menu, X, User, LogOut, Bell, Search, Home } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
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
  const [searchQuery, setSearchQuery] = useState('');

  const dashboardPath = user?.role === 'WORKSHOP' ? '/workshop/dashboard' : '/client/dashboard';
  const isWorkshop = user?.role === 'WORKSHOP';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/workshop/clients?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/workshop/clients');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('[Header] Erro no logout:', error);
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-[#0E71AE] border-b border-white/10 transition-all duration-300 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <Link to={dashboardPath} aria-label="Home DrivePluss" className="flex items-center space-x-2 group focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg outline-none mr-4">
            <div className="bg-white/20 rounded-lg p-1.5 shadow-lg group-hover:scale-105 transition-transform duration-300">
              <Car className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold text-white font-display tracking-tight hidden sm:block">
              Drive<span className="text-cyan-200">Pluss</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center flex-1 justify-center" aria-label="Main Navigation">
            {isWorkshop && isAuthenticated && (
              <form onSubmit={handleSearch} className="flex items-center w-full max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Procurar cliente pelo nome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-gray-400 placeholder-gray-400 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                </div>
              </form>
            )}
          </nav>

          <div className="hidden md:flex items-center space-x-3 ml-4">
            {isAuthenticated ? (
              <>
                {isWorkshop && (
                  <Button variant="ghost" size="icon" aria-label="Notificações" className="text-slate-400 hover:text-white relative transition-colors">
                    <Bell className="w-5 h-5" aria-hidden="true" />
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" aria-label="Menu do Usuário" className="flex items-center space-x-2 pl-2 pr-4 rounded-full border border-transparent hover:bg-white/10 hover:border-white/20 transition-all focus-visible:ring-2 focus-visible:ring-blue-400">
                      <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                        {user?.name?.charAt(0) || <User className="w-4 h-4" aria-hidden="true" />}
                      </div>
                      <span className="text-sm font-medium text-slate-200">
                        {user?.name?.split(' ')[0] || 'Usuário'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2 bg-white border border-gray-200 shadow-lg">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{user?.name || 'Usuário'}</span>
                        <span className="text-xs text-gray-500">{user?.email || 'email@exemplo.com'}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={dashboardPath} className="cursor-pointer text-gray-700 hover:text-gray-900">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/client/appointments" className="cursor-pointer text-gray-700 hover:text-gray-900">Meus Agendamentos</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/client/profile" className="cursor-pointer text-gray-700 hover:text-gray-900">Meu Perfil</Link>
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
                  <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all hover:scale-105">
                    Criar Conta
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="flex md:hidden items-center space-x-2">
             {isWorkshop && isAuthenticated && (
               <Button variant="ghost" size="icon" aria-label="Notificações" className="text-slate-400 hover:text-white relative transition-colors">
                 <Bell className="w-5 h-5" aria-hidden="true" />
               </Button>
             )}
             <Button variant="ghost" size="icon" aria-label="Abrir Menu" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
             </Button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#0E71AE] border-t border-white/10 animate-slide-up">
           <nav className="flex flex-col px-4 py-4 space-y-1" aria-label="Mobile Navigation">
              {!isWorkshop && (
                <Link 
                  to="/" 
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors",
                    location.pathname === "/" ? "bg-blue-600/20 text-white" : "text-slate-300"
                  )} 
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Home className="w-5 h-5" /> Início
                </Link>
              )}

              {isWorkshop && isAuthenticated && (
                <form onSubmit={handleSearch} className="flex items-center px-1 pb-2">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Procurar cliente pelo nome..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-400 placeholder-gray-400 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    />
                  </div>
                </form>
              )}

              {isAuthenticated ? (
                <>
                   {!isWorkshop && <Link to={dashboardPath} className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-slate-300 hover:text-white hover:bg-white/10" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>}
                   <Link to="/cliente/agendamentos" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-slate-300 hover:text-white hover:bg-white/10" onClick={() => setIsMobileMenuOpen(false)}>Meus Agendamentos</Link>
                   <Link to="/profile" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-slate-300 hover:text-white hover:bg-white/10" onClick={() => setIsMobileMenuOpen(false)}>Meu Perfil</Link>
                   <button 
                     className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-red-400 text-left"
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
                    <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white">Cadastrar</Button>
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
