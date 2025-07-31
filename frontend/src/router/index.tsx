import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from '../components/Layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminRoute from '../components/AdminRoute';
import LoadingSpinner from '../components/LoadingSpinner';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import LobbyPage from '../pages/LobbyPage';
import CollectionPage from '../pages/CollectionPage';
import PackStorePage from '../pages/PackStorePage';
import TeamBuilderPage from '../pages/TeamBuilderPage';
import LeaguePage from '../pages/LeaguePage';
import MatchDetailsPage from '../pages/MatchDetailsPage';

// Lazy load admin pages for better performance
const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage'));
const AdminPlayersPage = lazy(() => import('../pages/AdminPlayersPage'));
const AdminFormationsPage = lazy(() => import('../pages/AdminFormationsPage'));
const AdminPacksPage = lazy(() => import('../pages/AdminPacksPage'));

// Error boundary component
const ErrorPage = () => (
  <div className="error-page">
    <h1>🚫 Fehler</h1>
    <p>Diese Seite konnte nicht gefunden werden.</p>
    <a href="/">Zurück zur Startseite</a>
  </div>
);

// Route configuration
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'lobby',
        element: (
          <ProtectedRoute>
            <LobbyPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'collection',
        element: (
          <ProtectedRoute>
            <CollectionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'packs',
        element: (
          <ProtectedRoute>
            <PackStorePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'team-builder',
        element: (
          <ProtectedRoute>
            <TeamBuilderPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'league',
        element: (
          <ProtectedRoute>
            <LeaguePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'match/:matchId',
        element: (
          <ProtectedRoute>
            <MatchDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <Suspense fallback={<LoadingSpinner text="Lade Admin-Panel..." />}>
              <AdminDashboardPage />
            </Suspense>
          </AdminRoute>
        ),
      },
      {
        path: 'admin/players',
        element: (
          <AdminRoute>
            <Suspense fallback={<LoadingSpinner text="Lade Spieler-Verwaltung..." />}>
              <AdminPlayersPage />
            </Suspense>
          </AdminRoute>
        ),
      },
      {
        path: 'admin/formations',
        element: (
          <AdminRoute>
            <Suspense fallback={<LoadingSpinner text="Lade Formation-Verwaltung..." />}>
              <AdminFormationsPage />
            </Suspense>
          </AdminRoute>
        ),
      },
      {
        path: 'admin/packs',
        element: (
          <AdminRoute>
            <Suspense fallback={<LoadingSpinner text="Lade Pack-Verwaltung..." />}>
              <AdminPacksPage />
            </Suspense>
          </AdminRoute>
        ),
      },
    ],
  },
  // Auth routes without layout (full screen)
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
]);

export default router;