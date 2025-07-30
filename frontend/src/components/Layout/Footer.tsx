import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-section">
          <h4>Football TCG</h4>
          <p>Das ultimative Fußball-Sammelkartenspiel</p>
        </div>
        
        <div className="footer-section">
          <h4>Spiel</h4>
          <ul>
            <li>Spielregeln</li>
            <li>FAQ</li>
            <li>Updates</li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Community</h4>
          <ul>
            <li>Discord</li>
            <li>Reddit</li>
            <li>Twitter</li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Support</h4>
          <ul>
            <li>Kontakt</li>
            <li>Bug Report</li>
            <li>Datenschutz</li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2024 Football Trading Card Game. Alle Rechte vorbehalten.</p>
      </div>
    </footer>
  );
};

export default Footer;