import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES, ROUTE_LABELS } from '../constants/routes';

const AdminDashboardPage: React.FC = () => {
  return (
    <div className="admin-dashboard">
      <div className="container">
        <h1>Admin Panel</h1>
        <p className="admin-welcome">
          Willkommen im Administrationsbereich. Hier können Sie Spieler, Formationen und Packs verwalten.
        </p>

        <div className="admin-sections">
          <div className="admin-section-grid">
            <Link to={ROUTES.ADMIN_PLAYERS} className="admin-section-card">
              <div className="admin-card-icon">⚽</div>
              <h3>{ROUTE_LABELS[ROUTES.ADMIN_PLAYERS]}</h3>
              <p>
                Erstellen, bearbeiten und löschen Sie Fußballspieler. 
                Verwalten Sie Spielerattribute, Positionen und Bilder.
              </p>
              <div className="admin-card-arrow">→</div>
            </Link>

            <Link to={ROUTES.ADMIN_FORMATIONS} className="admin-section-card">
              <div className="admin-card-icon">📋</div>
              <h3>{ROUTE_LABELS[ROUTES.ADMIN_FORMATIONS]}</h3>
              <p>
                Erstellen und bearbeiten Sie Formationen mit Positionsangaben. 
                Definieren Sie Aufstellungen für Teams.
              </p>
              <div className="admin-card-arrow">→</div>
            </Link>

            <Link to={ROUTES.ADMIN_PACKS} className="admin-section-card">
              <div className="admin-card-icon">📦</div>
              <h3>{ROUTE_LABELS[ROUTES.ADMIN_PACKS]}</h3>
              <p>
                Verwalten Sie Kartenpacks und deren Inhalte. 
                Definieren Sie Preise und Spielerpools.
              </p>
              <div className="admin-card-arrow">→</div>
            </Link>
          </div>
        </div>

        <div className="admin-stats">
          <h2>Schnellübersicht</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">-</div>
              <div className="stat-label">Spieler gesamt</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">-</div>
              <div className="stat-label">Formationen</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">-</div>
              <div className="stat-label">Aktive Packs</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">-</div>
              <div className="stat-label">Registrierte Benutzer</div>
            </div>
          </div>
        </div>

        <div className="admin-actions">
          <h2>Schnellaktionen</h2>
          <div className="quick-actions">
            <Link to={ROUTES.ADMIN_PLAYERS} className="btn btn-primary">
              Neuen Spieler erstellen
            </Link>
            <Link to={ROUTES.ADMIN_FORMATIONS} className="btn btn-secondary">
              Neue Formation erstellen
            </Link>
            <Link to={ROUTES.ADMIN_PACKS} className="btn btn-secondary">
              Neues Pack erstellen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;