import type { UserRole } from '../components/routing/protected-route';
import Home from '../pages/home-page';
import LoginPage from '../pages/login-page';
import SignUpPage from '../pages/signup-page.tsx';
import Dashboard from '../pages/client/dashboard-page.tsx';
import AppLayout from '../layouts/app-layout';
import { AddCarPage } from '../pages/client/add-car-page.tsx';
import { SearchWorkshopsPage } from '../pages/client/search-workshops-page.tsx';
import SchedulingPage from '../pages/client/scheduling-page';
import SchedulingWorkshopPage from '../pages/client/scheduling-workshop-page';
import MySchedulesPage from '../pages/client/my-schedules-page';
import AppointmentsPage from '../pages/client/appointments-page';
import WorkshopPage from '../pages/client/workshop-page.tsx';
import CarPage from '../pages/client/car-page.tsx';
import ServiceHistoryPage from '../pages/client/service-history-page.tsx';

// Workshop Pages
import WorkshopDashboardPage from '../pages/workshop/dashboard-page';
import WorkshopOrdersPage from '../pages/workshop/orders-page';
import WorkshopServicesPage from '../pages/workshop/services-page';
import CreateOrdersPage from '../pages/workshop/create-orders-page';
import ServicesPage from '../pages/client/services-page.tsx';
import PaymentReturnPage from '../pages/payment-return-page';
import WorkshopUsersPage from '../pages/workshop/users-page.tsx';
import WorkshopClientsPage from '../pages/workshop/clients-page.tsx';
import ClientDetailPage from '../pages/workshop/client-detail-page.tsx';
import ClientOrdersPage from '../pages/workshop/client-orders-page.tsx';
import WorkshopServiceHistoryPage from '../pages/workshop/service-history-page.tsx';
import WorkshopSchedulesPage from '../pages/workshop/schedules-page';
import WorkshopRatingsPage from '../pages/workshop/ratings-page';
import WorkshopServicesOfferedPage from '../pages/workshop/services-offered-page';
import ProfilePage from '../pages/shared/profile-page.tsx';

// Messages Pages
import ClientMessagesPage from '../pages/client/messages-page.tsx';
import ClientChatPage from '../pages/client/chat-page.tsx';
import WorkshopMessagesPage from '../pages/workshop/messages-page.tsx';
import WorkshopChatPage from '../pages/workshop/chat-page.tsx';


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

/*
  Typed as UserRole so a typo in a route's role is a compile error rather
  than a string that silently never matches (the previous failure mode:
  `requiredRole` was passed to a component that ignored it).
*/
export const protectedRoutes: {
  path: string;
  role: UserRole;
  element: React.ReactNode;
}[] = [
  // CLIENT ROUTES
  {
    path: '/client/dashboard',
    role: 'CLIENT',
    element: <AppLayout><Dashboard /></AppLayout>,
  },
  {
    path: '/client/my-car',
    role: 'CLIENT',
    element: <AppLayout><CarPage /></AppLayout>,
  },
  {
    path: 'cars/new',
    role: 'CLIENT',
    element: <AppLayout><AddCarPage /></AppLayout>,
  },
  {
    path: '/client/appointments',
    role: 'CLIENT',
    element: <AppLayout><AppointmentsPage /></AppLayout>,
  },
  {
    path: '/client/search-workshops',
    role: 'CLIENT',
    element: <AppLayout><SearchWorkshopsPage /></AppLayout>,
  },
  {
    path: '/client/scheduling',
    role: 'CLIENT',
    element: <AppLayout><SchedulingPage /></AppLayout>,
  },
  {
    path: '/client/scheduling/:workshopId',
    role: 'CLIENT',
    element: <AppLayout><SchedulingWorkshopPage /></AppLayout>,
  },
  {
    path: '/client/my-schedules',
    role: 'CLIENT',
    element: <AppLayout><MySchedulesPage /></AppLayout>,
  },
  {
    path: '/client/my-workshops',
    role: 'CLIENT',
    element: <AppLayout><WorkshopPage /></AppLayout>,
  },
  {
    path: '/client/services',
    role: 'CLIENT',
    element: <AppLayout><ServicesPage /></AppLayout>,
  },
  {
    path: '/client/services/:serviceId',
    role: 'CLIENT',
    element: <AppLayout><ServicesPage /></AppLayout>,
  },
  {
    path: '/client/service-history',
    role: 'CLIENT',
    element: <AppLayout><ServiceHistoryPage /></AppLayout>,
  },
  {
    path: '/payments/return',
    role: 'CLIENT',
    element: <PaymentReturnPage />,
  },
  {
    path: '/client/profile',
    role: 'CLIENT',
    element: <AppLayout><ProfilePage /></AppLayout>,
  },
  /*
    The menu's "Configurações" destination. It is the profile page, and it is a
    real route rather than a dead link — which is what it was: both sidebars
    pointed at /client/settings and /workshop/settings, and neither existed.
  */
  {
    path: '/client/settings',
    role: 'CLIENT',
    element: <AppLayout><ProfilePage /></AppLayout>,
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
  {
    path: '/workshop/orders/new',
    role: 'WORKSHOP',
    element: <AppLayout><CreateOrdersPage /></AppLayout>,
  },
  {
    path: '/workshop/clients',
    role: 'WORKSHOP',
    element: <AppLayout><WorkshopClientsPage /></AppLayout>,
  },
  {
    path: '/workshop/schedules',
    role: 'WORKSHOP',
    element: <AppLayout><WorkshopSchedulesPage /></AppLayout>,
  },
  {
    path: '/workshop/ratings',
    role: 'WORKSHOP',
    element: <AppLayout><WorkshopRatingsPage /></AppLayout>,
  },
  {
    path: '/workshop/services-offered',
    role: 'WORKSHOP',
    element: <AppLayout><WorkshopServicesOfferedPage /></AppLayout>,
  },
  {
    path: '/workshop/clients/:clientId',
    role: 'WORKSHOP',
    element: <AppLayout><ClientDetailPage /></AppLayout>,
  },
  {
    path: '/workshop/clients/:clientId/orders',
    role: 'WORKSHOP',
    element: <AppLayout><ClientOrdersPage /></AppLayout>,
  },
  {
    path: '/workshop/profile',
    role: 'WORKSHOP',
    element: <AppLayout><ProfilePage /></AppLayout>,
  },
  /* See the note on /client/settings. */
  {
    path: '/workshop/settings',
    role: 'WORKSHOP',
    element: <AppLayout><ProfilePage /></AppLayout>,
  },
  {
    path: '/workshop/:workshopId/clients',
    role: 'WORKSHOP',
    element : <AppLayout><WorkshopUsersPage /></AppLayout>
  },
  {
    path: '/workshop/service-history',
    role: 'WORKSHOP',
    element: <AppLayout><WorkshopServiceHistoryPage /></AppLayout>,
  },

  // CLIENT MESSAGES
  {
    path: '/client/messages',
    role: 'CLIENT',
    element: <AppLayout><ClientMessagesPage /></AppLayout>,
  },
  {
    path: '/client/messages/chat/:workshopUserId',
    role: 'CLIENT',
    element: <AppLayout><ClientChatPage /></AppLayout>,
  },

  // WORKSHOP MESSAGES
  {
    path: '/workshop/messages',
    role: 'WORKSHOP',
    element: <AppLayout><WorkshopMessagesPage /></AppLayout>,
  },
  {
    path: '/workshop/messages/chat/:clientUserId',
    role: 'WORKSHOP',
    element: <AppLayout><WorkshopChatPage /></AppLayout>,
  },
];

/*
  The second `ProtectedRoute` that used to live here was never imported:
  `App.tsx` uses `components/routing/protected-route.tsx`. The role check it
  performed has moved into that component, so there is now one implementation.
*/
