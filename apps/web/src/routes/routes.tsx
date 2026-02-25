import Home from '../pages/home-page';
import LoginPage from '../pages/login-page';
import SignUpPage from '../pages/signup-page.tsx';
import Dashboard from '../pages/dashboard-page';
import DashboardLayout from '../layouts/dashboard-layout';
import { AddCarPage } from '../pages/add-car-page.tsx';
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
  // {
  //   path: '/trips',
  //   element: <DashboardLayout><Dashboard /></DashboardLayout>,
  // },
  {
    path: '/cars/new',
    element: <DashboardLayout><AddCarPage /></DashboardLayout>,
  },
  // {
  //   path: '/cars/:carId',
  //   element: <DashboardLayout><CarDetailsPage /></DashboardLayout>,
  // },
  // {
  //   path: '/trips/:tripId/edit',
  //   element: <DashboardLayout><EditTripPage /></DashboardLayout>,
  // }
];