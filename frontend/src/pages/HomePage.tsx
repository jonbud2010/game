import React from 'react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>⚽ Football Trading Card Game</h1>
        <p>Sammle Karten, baue Teams und kämpfe in der Liga!</p>
        
        <div className="action-buttons">
          <Link to="/lobby" className="btn btn-primary">
            Spiel beitreten
          </Link>
          <Link to="/collection" className="btn btn-secondary">
            Meine Sammlung
          </Link>
          <Link to="/packs" className="btn btn-secondary">
            Pack Store
          </Link>
        </div>
      </div>
      
      <div className="features-section">
        <div className="feature">
          <h3>🃏 Sammle Karten</h3>
          <p>Öffne Packs und sammle die besten Fußballspieler</p>
        </div>
        <div className="feature">
          <h3>⚡ Team-Chemie</h3>
          <p>Kombiniere Farben für mächtige Boni</p>
        </div>
        <div className="feature">
          <h3>🏆 Liga-System</h3>
          <p>Kämpfe gegen 3 andere Spieler in der Liga</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;