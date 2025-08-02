import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const Footer: React.FC = () => {
  const { t } = useTranslation('common');
  
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-section">
          <h4>{t('footer.company.title')}</h4>
          <ul>
            <li>{t('footer.company.about')}</li>
            <li>{t('footer.company.careers')}</li>
            <li>{t('footer.company.contact')}</li>
            <li>{t('footer.company.privacy')}</li>
            <li>{t('footer.company.terms')}</li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>{t('footer.game.title')}</h4>
          <ul>
            <li>{t('footer.game.how_to_play')}</li>
            <li>{t('footer.game.rules')}</li>
            <li>{t('footer.game.faq')}</li>
            <li>{t('footer.game.community')}</li>
            <li>{t('footer.game.support')}</li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>{t('footer.social.title')}</h4>
          <ul>
            <li>{t('footer.social.discord')}</li>
            <li>{t('footer.social.twitter')}</li>
            <li>{t('footer.social.reddit')}</li>
            <li>{t('footer.social.youtube')}</li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>{t('footer.copyright')}</p>
      </div>
    </footer>
  );
};

export default Footer;