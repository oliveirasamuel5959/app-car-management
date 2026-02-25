import Home from '../pages/home-page';
import LoginPage from '../pages/login-page';
import SignUpPage from '../pages/signup-page.tsx';
import Dashboard from '../pages/dashboard-page';
import DashboardLayout from '../layouts/dashboard-layout';
import { AddCarPage } from '../pages/add-car-page.tsx';
import { SearchWorkshopsPage } from '../pages/search-workshops-page.tsx';
import WorkshopPage from '../pages/workshop-page.tsx';
import CarPage from '../pages/car-page.tsx';
// import NewTripPage from '../pages/NewTripPage';
// import TripDetailsPage from '../pages/TripDetailsPage';
// import EditTripPage from '../pages/EditTripPage';

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
  {
    path: '/dashboard',
    element: <DashboardLayout><Dashboard /></DashboardLayout>,
  },
  {
    path: '/my-car',
    element: <DashboardLayout><CarPage /></DashboardLayout>,
  },
  {
    path: '/cars/new',
    element: <DashboardLayout><AddCarPage /></DashboardLayout>,
  },
  {
    path: '/search-workshops',
    element: <DashboardLayout><SearchWorkshopsPage /></DashboardLayout>,
  },
  {
    path: '/my-workshops',
    element: <DashboardLayout><WorkshopPage /></DashboardLayout>,
  }
  // {
  //   path: '/trips/:tripId/edit',
  //   element: <DashboardLayout><EditTripPage /></DashboardLayout>,
  // }
];