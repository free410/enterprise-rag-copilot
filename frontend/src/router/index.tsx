import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import LoginPage from '@/pages/Login/index';
import DashboardPage from '@/pages/Dashboard/index';
import DocumentsPage from '@/pages/Documents/index';
import ChatPage from '@/pages/Chat/index';
import HistoryPage from '@/pages/History/index';
import SettingsPage from '@/pages/Settings/index';
import { isAuthenticated } from '@/utils/auth';

function ProtectedRoute() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <AdminLayout />;
}

function PublicOnlyRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <PublicOnlyRoute />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
    ],
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'documents',
        element: <DocumentsPage />,
      },
      {
        path: 'chat',
        element: <ChatPage />,
      },
      {
        path: 'history',
        element: <HistoryPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
