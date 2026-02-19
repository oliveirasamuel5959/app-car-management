import Home from '../pages/home-page';
import LoginPage from '../pages/login-page';
import SignUpPage from '../pages/signup-page.tsx';
import Dashboard from '../pages/dashboard-page';
import DashboardLayout from '../layouts/dashboard-layout';
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
    path: '/dashboard',
    element: <DashboardLayout><Dashboard /></DashboardLayout>,
  },
  {
    path: '/signup',
    element: <SignUpPage />,
  }
];

export const protectedRoutes = [
  // {
  //   path: '/dashboard',
  //   element: <DashboardLayout><Dashboard /></DashboardLayout>,
  // },
  // {
  //   path: '/trips',
  //   element: <DashboardLayout><Dashboard /></DashboardLayout>,
  // },
  // {
  //   path: '/trips/new',
  //   element: <DashboardLayout><NewTripPage /></DashboardLayout>,
  // },
  // {
  //   path: '/trips/:tripId',
  //   element: <DashboardLayout><TripDetailsPage /></DashboardLayout>,
  // },
  // {
  //   path: '/trips/:tripId/edit',
  //   element: <DashboardLayout><EditTripPage /></DashboardLayout>,
  // }
];