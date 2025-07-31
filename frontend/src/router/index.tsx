import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminRoute from '../components/AdminRoute';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import LobbyPage from '../pages/LobbyPage';
import CollectionPage from '../pages/CollectionPage';
import PackStorePage from '../pages/PackStorePage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import AdminPlayersPage from '../pages/AdminPlayersPage';
import AdminFormationsPage from '../pages/AdminFormationsPage';
import AdminPacksPage from '../pages/AdminPacksPage';
import TeamBuilderPage from '../pages/TeamBuilderPage';
import LeaguePage from '../pages/LeaguePage';
import MatchDetailsPage from '../pages/MatchDetailsPage';

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
            <AdminDashboardPage />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/players',
        element: (
          <AdminRoute>
            <AdminPlayersPage />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/formations',
        element: (
          <AdminRoute>
            <AdminFormationsPage />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/packs',
        element: (
          <AdminRoute>
            <AdminPacksPage />
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