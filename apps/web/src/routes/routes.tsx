import Home from '../pages/home-page';
import LoginPage from '../pages/login-page';
import SignUpPage from '../pages/signup-page.tsx';
import Dashboard from '../pages/client/dashboard-page.tsx';
import AppLayout from '../layouts/app-layout';
import { AddCarPage } from '../pages/client/add-car-page.tsx';
import { SearchWorkshopsPage } from '../pages/client/search-workshops-page.tsx';
import WorkshopPage from '../pages/client/workshop-page.tsx';
import CarPage from '../pages/client/car-page.tsx';
import { useAuth } from '../context/auth-context';
import { Navigate } from 'react-router-dom';

// Workshop Pages
import WorkshopDashboardPage from '../pages/workshop/dashboard-page';
import WorkshopOrdersPage from '../pages/workshop/orders-page';
import WorkshopServicesPage from '../pages/workshop/services-page';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'CLIENT' | 'WORKSHOP';
}


export const publicRoutes = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignUpPage />,
  }
];

export const protectedRoutes = [
  // CLIENT ROUTES
  {
    path: '/dashboard',
    role: 'CLIENT',
    element: <AppLayout><Dashboard /></AppLayout>,
  },
  {
    path: '/my-car',
    role: 'CLIENT',
    element: <AppLayout><CarPage /></AppLayout>,
  },
  {
    path: '/cars/new',
    role: 'CLIENT',
    element: <AppLayout><AddCarPage /></AppLayout>,
  },
  {
    path: '/search-workshops',
    role: 'CLIENT',
    element: <AppLayout><SearchWorkshopsPage /></AppLayout>,
  },
  {
    path: '/my-workshops',
    role: 'CLIENT',
    element: <AppLayout><WorkshopPage /></AppLayout>,
  },

  // WORKSHOP ROUTES
  {
    path: '/workshop/dashboard',
    role: 'WORKSHOP',
    element: <AppLayout><WorkshopDashboardPage /></AppLayout>,
  },
  {
    path: '/workshop/orders',
    role: 'WORKSHOP',
    element: <AppLayout><WorkshopOrdersPage /></AppLayout>,
  },
  {
    path: '/workshop/services',
    role: 'WORKSHOP',
    element: <AppLayout><WorkshopServicesPage /></AppLayout>,
  },
];

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;