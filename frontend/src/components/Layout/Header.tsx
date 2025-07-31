import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <span className="logo-icon">⚽</span>
            <span className="logo-text">Football TCG</span>
          </Link>
        </div>
        
        <nav className="main-nav">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/lobby" 
            className={`nav-link ${isActive('/lobby') ? 'active' : ''}`}
          >
            Lobbies
          </Link>
          <Link 
            to="/collection" 
            className={`nav-link ${isActive('/collection') ? 'active' : ''}`}
          >
            Sammlung
          </Link>
          <Link 
            to="/packs" 
            className={`nav-link ${isActive('/packs') ? 'active' : ''}`}
          >
            Packs
          </Link>
          <Link 
            to="/team-builder" 
            className={`nav-link ${isActive('/team-builder') ? 'active' : ''}`}
          >
            Team Builder
          </Link>
          {isAuthenticated && user?.role === 'ADMIN' && (
            <Link 
              to="/admin" 
              className={`nav-link admin-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
            >
              🔧 Admin
            </Link>
          )}
        </nav>
        
        <div className="user-actions">
          {isAuthenticated && user ? (
            <>
              <span className="user-coins">💰 {user.coins}</span>
              <Link to="/profile" className="user-profile">
                👤 {user.username}
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary btn-small">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary btn-small">
                Login
              </Link>
              <Link to="/register" className="btn btn-secondary btn-small">
                Registrieren
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;