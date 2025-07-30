import React from 'react';

const CollectionPage: React.FC = () => {
  return (
    <div className="collection-page">
      <div className="page-header">
        <h1>📚 Meine Sammlung</h1>
        <p>Verwalte deine Spielerkarten und erstelle Teams</p>
      </div>
      
      <div className="collection-stats">
        <div className="stat-card">
          <h3>Gesammelte Karten</h3>
          <span className="stat-value">0</span>
        </div>
        <div className="stat-card">
          <h3>Münzen</h3>
          <span className="stat-value">1000</span>
        </div>
        <div className="stat-card">
          <h3>Teams erstellt</h3>
          <span className="stat-value">0</span>
        </div>
      </div>
      
      <div className="collection-filters">
        <select className="filter-select">
          <option value="">Alle Positionen</option>
          <option value="GK">Torwart</option>
          <option value="CB">Innenverteidiger</option>
          <option value="ST">Stürmer</option>
        </select>
        
        <select className="filter-select">
          <option value="">Alle Farben</option>
          <option value="RED">Rot</option>
          <option value="BLUE">Blau</option>
          <option value="GREEN">Grün</option>
        </select>
      </div>
      
      <div className="collection-grid">
        <div className="empty-collection">
          <p>🃏 Keine Karten in deiner Sammlung</p>
          <p>Öffne Packs, um Spieler zu sammeln!</p>
          <button className="btn btn-primary">
            Zum Pack Store
          </button>
        </div>
      </div>
      
      <div className="coming-soon">
        <p>🚧 Sammlungs-Management wird bald implementiert</p>
      </div>
    </div>
  );
};

export default CollectionPage;