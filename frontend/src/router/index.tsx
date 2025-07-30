import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import LobbyPage from '../pages/LobbyPage';
import CollectionPage from '../pages/CollectionPage';
import PackStorePage from '../pages/PackStorePage';

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