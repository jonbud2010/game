import React from 'react';

const PackStorePage: React.FC = () => {
  return (
    <div className="pack-store-page">
      <div className="page-header">
        <h1>🎁 Pack Store</h1>
        <p>Kaufe Packs und entdecke neue Spieler!</p>
      </div>
      
      <div className="user-coins">
        <span className="coins-display">💰 1000 Münzen</span>
      </div>
      
      <div className="packs-grid">
        <div className="pack-card">
          <div className="pack-image">
            <span className="pack-icon">📦</span>
          </div>
          <h3>Starter Pack</h3>
          <p>Grundlegende Spieler für den Anfang</p>
          <div className="pack-price">100 Münzen</div>
          <button className="btn btn-primary">Kaufen</button>
        </div>
        
        <div className="pack-card premium">
          <div className="pack-image">
            <span className="pack-icon">✨</span>
          </div>
          <h3>Premium Pack</h3>
          <p>Höhere Chance auf starke Spieler</p>
          <div className="pack-price">250 Münzen</div>
          <button className="btn btn-primary">Kaufen</button>
        </div>
        
        <div className="pack-card legendary">
          <div className="pack-image">
            <span className="pack-icon">🏆</span>
          </div>
          <h3>Legend Pack</h3>
          <p>Garantiert legendäre Spieler</p>
          <div className="pack-price">500 Münzen</div>
          <button className="btn btn-primary">Kaufen</button>
        </div>
      </div>
      
      <div className="pack-opening-info">
        <h3>💡 Pack-Opening Tipps</h3>
        <ul>
          <li>Jeder Pack enthält zufällige Spieler</li>
          <li>Höhere Preise = bessere Chancen</li>
          <li>Sammle verschiedene Farben für Team-Chemie</li>
        </ul>
      </div>
      
      <div className="coming-soon">
        <p>🚧 Pack-Opening System wird bald implementiert</p>
      </div>
    </div>
  );
};

export default PackStorePage;