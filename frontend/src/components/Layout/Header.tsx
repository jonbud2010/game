import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';

const Header: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation('common');
  
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
            {t('navigation.home')}
          </Link>
          <Link 
            to="/lobby" 
            className={`nav-link ${isActive('/lobby') ? 'active' : ''}`}
          >
            {t('navigation.lobbies')}
          </Link>
          <Link 
            to="/collection" 
            className={`nav-link ${isActive('/collection') ? 'active' : ''}`}
          >
            {t('navigation.collection')}
          </Link>
          <Link 
            to="/packs" 
            className={`nav-link ${isActive('/packs') ? 'active' : ''}`}
          >
            {t('navigation.packs')}
          </Link>
          <Link 
            to="/team-builder" 
            className={`nav-link ${isActive('/team-builder') ? 'active' : ''}`}
          >
            {t('navigation.team_builder')}
          </Link>
          <Link 
            to="/league" 
            className={`nav-link ${isActive('/league') ? 'active' : ''}`}
          >
            {t('navigation.league')}
          </Link>
          {isAuthenticated && user?.role === 'ADMIN' && (
            <Link 
              to="/admin" 
              className={`nav-link admin-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
            >
              🔧 {t('navigation.admin')}
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
                {t('buttons.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary btn-small">
                {t('buttons.login')}
              </Link>
              <Link to="/register" className="btn btn-secondary btn-small">
                {t('buttons.register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;