import React, { useState, useEffect } from 'react';
import { apiService, type Pack, type Player, type PackOpenResult } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const PackStorePage: React.FC = () => {
  const { user, setUser } = useAuth();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [packResult, setPackResult] = useState<PackOpenResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Load available packs
  useEffect(() => {
    const loadPacks = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getAvailablePacks();
        if (response.success && response.data) {
          setPacks(response.data);
        } else {
          setError(response.error || 'Failed to load packs');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load packs');
      } finally {
        setLoading(false);
      }
    };

    loadPacks();
  }, []);

  const handleOpenPack = async (pack: Pack) => {
    if (!user || user.coins < pack.price) {
      setError(`You need ${pack.price} coins to open this pack`);
      return;
    }

    try {
      setOpening(pack.id);
      setError(null);
      setAnimating(true);
      
      // Simulate pack opening animation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await apiService.openPack(pack.id);
      if (response.success && response.data) {
        setPackResult(response.data);
        setShowResultModal(true);
        
        // Update user coins
        if (setUser && user) {
          setUser({
            ...user,
            coins: response.data.remainingCoins
          });
        }
        
        // Reload packs to update player counts and status
        const packsResponse = await apiService.getAvailablePacks();
        if (packsResponse.success && packsResponse.data) {
          setPacks(packsResponse.data);
        }
      } else {
        setError(response.error || 'Failed to open pack');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open pack');
    } finally {
      setOpening(null);
      setAnimating(false);
    }
  };

  const closeResultModal = () => {
    setShowResultModal(false);
    setPackResult(null);
  };

  const getPackTypeStyle = (pack: Pack) => {
    if (pack.price >= 500) return 'legendary';
    if (pack.price >= 250) return 'premium';
    return 'starter';
  };

  const getPackIcon = (pack: Pack) => {
    if (pack.price >= 500) return '🏆';
    if (pack.price >= 250) return '✨';
    return '📦';
  };

  if (loading) {
    return (
      <div className="pack-store-page">
        <div className="loading">Loading pack store...</div>
      </div>
    );
  }

  return (
    <div className="pack-store-page">
      <div className="page-header">
        <h1>🎁 Pack Store</h1>
        <p>Kaufe Packs und entdecke neue Spieler!</p>
      </div>
      
      <div className="user-coins">
        <span className="coins-display">💰 {user?.coins || 0} Münzen</span>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}
      
      <div className="packs-grid">
        {packs.length === 0 ? (
          <div className="no-packs">
            <p>No packs available at the moment</p>
          </div>
        ) : (
          packs.map(pack => (
            <div key={pack.id} className={`pack-card ${getPackTypeStyle(pack)}`}>
              <div className="pack-image">
                <span className="pack-icon">{getPackIcon(pack)}</span>
                {opening === pack.id && (
                  <div className="pack-opening-animation">
                    <div className="spinner"></div>
                  </div>
                )}
              </div>
              <h3>{pack.name}</h3>
              <p>{pack.playerCount} players available</p>
              <div className="pack-price">{pack.price} Münzen</div>
              <button 
                className="btn btn-primary"
                onClick={() => handleOpenPack(pack)}
                disabled={
                  opening === pack.id || 
                  !user || 
                  user.coins < pack.price ||
                  pack.status !== 'ACTIVE' ||
                  pack.playerCount === 0
                }
              >
                {opening === pack.id ? 'Opening...' : 
                 pack.status !== 'ACTIVE' ? 'Unavailable' :
                 pack.playerCount === 0 ? 'Empty' :
                 !user || user.coins < pack.price ? 'Not enough coins' :
                 'Open Pack'}
              </button>
            </div>
          ))
        )}
      </div>
      
      <div className="pack-opening-info">
        <h3>💡 Pack-Opening Tipps</h3>
        <ul>
          <li>Jeder Pack enthält einen zufälligen Spieler</li>
          <li>Höhere Preise = bessere Spieler-Chancen</li>
          <li>Packs schrumpfen nach jedem Kauf</li>
          <li>Sammle verschiedene Farben für Team-Chemie</li>
        </ul>
      </div>

      {/* Pack Opening Result Modal */}
      {showResultModal && packResult && (
        <div className="modal-overlay" onClick={closeResultModal}>
          <div className="pack-result-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎉 Pack Opened!</h2>
              <button className="close-button" onClick={closeResultModal}>×</button>
            </div>
            
            <div className="pack-result-content">
              <div className="drawn-player">
                <div className="player-card-large">
                  <img
                    src={packResult.drawnPlayer.imageUrl || '/images/players/default.jpg'}
                    alt={packResult.drawnPlayer.name}
                    className="player-image"
                  />
                  <div className="player-info">
                    <h3>{packResult.drawnPlayer.name}</h3>
                    <div className="player-details">
                      <span className="player-position">{packResult.drawnPlayer.position}</span>
                      <span className="player-points">{packResult.drawnPlayer.points} pts</span>
                    </div>
                    <div 
                      className="player-color-badge"
                      style={{ backgroundColor: `var(--color-${packResult.drawnPlayer.color})` }}
                    >
                      {packResult.drawnPlayer.color}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pack-result-stats">
                <div className="stat">
                  <label>Coins Spent:</label>
                  <span>{packResult.coinsSpent}</span>
                </div>
                <div className="stat">
                  <label>Remaining Coins:</label>
                  <span>{packResult.remainingCoins}</span>
                </div>
                <div className="stat">
                  <label>Players Left in Pack:</label>
                  <span>{packResult.remainingPlayersInPack}</span>
                </div>
                {packResult.packNowEmpty && (
                  <div className="pack-empty-notice">
                    🚨 This pack is now empty!
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={closeResultModal}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Pack Opening Animation Overlay */}
      {animating && (
        <div className="pack-animation-overlay">
          <div className="pack-animation">
            <div className="pack-shake">📦</div>
            <p>Opening pack...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackStorePage;