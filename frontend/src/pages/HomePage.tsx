import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

const HomePage: React.FC = () => {
  const { t } = useTranslation('common');
  
  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>⚽ {t('pages.home.title')}</h1>
        <p>{t('pages.home.subtitle')}</p>
        
        <div className="action-buttons">
          <Link to="/lobby" className="btn btn-primary">
            {t('pages.home.join_game')}
          </Link>
          <Link to="/collection" className="btn btn-secondary">
            {t('pages.home.my_collection')}
          </Link>
          <Link to="/packs" className="btn btn-secondary">
            {t('pages.home.pack_store')}
          </Link>
        </div>
      </div>
      
      <div className="features-section">
        <div className="feature">
          <h3>🃏 {t('pages.home.features.collect_cards.title')}</h3>
          <p>{t('pages.home.features.collect_cards.description')}</p>
        </div>
        <div className="feature">
          <h3>⚡ {t('pages.home.features.team_chemistry.title')}</h3>
          <p>{t('pages.home.features.team_chemistry.description')}</p>
        </div>
        <div className="feature">
          <h3>🏆 {t('pages.home.features.league_system.title')}</h3>
          <p>{t('pages.home.features.league_system.description')}</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;