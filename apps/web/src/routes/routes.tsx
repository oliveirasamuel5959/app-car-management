import Home from '../pages/home-page';
import LoginPage from '../pages/login-page';
import SignUpPage from '../pages/signup-page.tsx';
import Dashboard from '../pages/client/dashboard-page.tsx';
import AppLayout from '../layouts/app-layout';
import { AddCarPage } from '../pages/client/add-car-page.tsx';
import { SearchWorkshopsPage } from '../pages/client/search-workshops-page.tsx';
import WorkshopPage from '../pages/client/workshop-page.tsx';
import CarPage from '../pages/client/car-page.tsx';

// Workshop Pages
import WorkshopDashboardPage from '../pages/workshop/dashboard-page';
import WorkshopOrdersPage from '../pages/workshop/orders-page';
import WorkshopServicesPage from '../pages/workshop/services-page';


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
    element: <AppLayout><Dashboard /></AppLayout>,
  },
  {
    path: '/my-car',
    element: <AppLayout><CarPage /></AppLayout>,
  },
  {
    path: '/cars/new',
    element: <AppLayout><AddCarPage /></AppLayout>,
  },
  {
    path: '/search-workshops',
    element: <AppLayout><SearchWorkshopsPage /></AppLayout>,
  },
  {
    path: '/my-workshops',
    element: <AppLayout><WorkshopPage /></AppLayout>,
  },

  // WORKSHOP ROUTES
  {
    path: '/workshop/dashboard',
    element: <AppLayout><WorkshopDashboardPage /></AppLayout>,
  },
  {
    path: '/workshop/orders',
    element: <AppLayout><WorkshopOrdersPage /></AppLayout>,
  },
  {
    path: '/workshop/services',
    element: <AppLayout><WorkshopServicesPage /></AppLayout>,
  },
];