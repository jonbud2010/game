import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, type Player, type UserPlayer } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';

const CollectionPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [userPlayers, setUserPlayers] = useState<UserPlayer[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<UserPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [colorFilter, setColorFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'points' | 'name'>('newest');

  // Load user's collection
  useEffect(() => {
    const loadCollection = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiService.getUserCollection();
        if (response.success && response.data) {
          setUserPlayers(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load collection');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadCollection();
    }
  }, [user]);

  // Filter and sort players
  useEffect(() => {
    let filtered = [...userPlayers];

    // Apply position filter
    if (positionFilter) {
      filtered = filtered.filter(up => up.player.position === positionFilter);
    }

    // Apply color filter
    if (colorFilter) {
      filtered = filtered.filter(up => up.player.color === colorFilter.toLowerCase());
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime();
        case 'oldest':
          return new Date(a.acquiredAt).getTime() - new Date(b.acquiredAt).getTime();
        case 'points':
          return b.player.points - a.player.points;
        case 'name':
          return a.player.name.localeCompare(b.player.name);
        default:
          return 0;
      }
    });

    setFilteredPlayers(filtered);
  }, [userPlayers, positionFilter, colorFilter, sortBy]);

  // Calculate collection stats
  const getCollectionStats = () => {
    const totalCards = userPlayers.length;
    const uniquePlayers = new Set(userPlayers.map(up => up.playerId)).size;
    const totalPoints = userPlayers.reduce((sum, up) => sum + up.player.points, 0);
    const colorDistribution = userPlayers.reduce((acc, up) => {
      acc[up.player.color] = (acc[up.player.color] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalCards, uniquePlayers, totalPoints, colorDistribution };
  };

  const stats = getCollectionStats();

  // Get unique positions and colors for filters
  const availablePositions = [...new Set(userPlayers.map(up => up.player.position))].sort();
  const availableColors = [...new Set(userPlayers.map(up => up.player.color))].sort();

  const handleNavigateToPackStore = () => {
    navigate('/pack-store');
  };

  const handleNavigateToTeamBuilder = () => {
    navigate('/team-builder');
  };

  if (loading) {
    return (
      <div className="collection-page">
        <div className="loading">{t('messages.loading_collection')}</div>
      </div>
    );
  }

  return (
    <div className="collection-page">
      <div className="page-header">
        <h1>📚 {t('pages.collection.title')}</h1>
        <p>{t('pages.collection.subtitle')}</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}
      
      <div className="collection-stats">
        <div className="stat-card">
          <h3>{t('pages.collection.collected_cards')}</h3>
          <span className="stat-value">{stats.totalCards}</span>
          <small>({stats.uniquePlayers} {t('pages.collection.unique')})</small>
        </div>
        <div className="stat-card">
          <h3>{t('labels.coins')}</h3>
          <span className="stat-value">{user?.coins || 0}</span>
        </div>
        <div className="stat-card">
          <h3>{t('pages.collection.total_points')}</h3>
          <span className="stat-value">{stats.totalPoints}</span>
        </div>
        <div className="stat-card">
          <h3>{t('pages.collection.colors')}</h3>
          <span className="stat-value">{Object.keys(stats.colorDistribution).length}</span>
        </div>
      </div>

      {userPlayers.length > 0 && (
        <>
          <div className="collection-controls">
            <div className="collection-filters">
              <select 
                className="filter-select"
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
              >
                <option value="">{t('pages.collection.all_positions')}</option>
                {availablePositions.map(position => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
              
              <select 
                className="filter-select"
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
              >
                <option value="">{t('pages.collection.all_colors')}</option>
                {availableColors.map(color => (
                  <option key={color} value={color}>{color.charAt(0).toUpperCase() + color.slice(1)}</option>
                ))}
              </select>

              <select 
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">{t('pages.collection.newest_first')}</option>
                <option value="oldest">{t('pages.collection.oldest_first')}</option>
                <option value="points">{t('pages.collection.highest_points')}</option>
                <option value="name">{t('pages.collection.alphabetical')}</option>
              </select>
            </div>

            <div className="collection-actions">
              <button className="btn btn-secondary" onClick={handleNavigateToTeamBuilder}>
                🏗️ {t('pages.collection.team_builder')}
              </button>
              <button className="btn btn-primary" onClick={handleNavigateToPackStore}>
                🎁 {t('pages.collection.open_packs')}
              </button>
            </div>
          </div>

          <div className="collection-summary">
            <p>{t('pages.collection.showing_cards', {count: filteredPlayers.length, total: userPlayers.length})}</p>
          </div>
        </>
      )}
      
      <div className="collection-grid">
        {userPlayers.length === 0 ? (
          <div className="empty-collection">
            <div className="empty-icon">🃏</div>
            <h3>{t('pages.collection.no_cards')}</h3>
            <p>{t('pages.collection.no_cards_description')}</p>
            <div className="empty-actions">
              <button className="btn btn-primary" onClick={handleNavigateToPackStore}>
                🎁 {t('pages.collection.to_pack_store')}
              </button>
            </div>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="no-results">
            <p>{t('pages.collection.no_results')}</p>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setPositionFilter('');
                setColorFilter('');
              }}
            >
              {t('pages.collection.reset_filters')}
            </button>
          </div>
        ) : (
          filteredPlayers.map(userPlayer => (
            <div key={userPlayer.id} className="player-card">
              <div className="card-header">
                <img
                  src={userPlayer.player.imageUrl || '/images/players/default.jpg'}
                  alt={userPlayer.player.name}
                  className="player-image"
                />
                <div 
                  className="player-color-indicator"
                  style={{ backgroundColor: `var(--color-${userPlayer.player.color})` }}
                />
              </div>
              
              <div className="card-content">
                <h3 className="player-name">{userPlayer.player.name}</h3>
                <div className="player-details">
                  <span className="player-position">{userPlayer.player.position}</span>
                  <span className="player-points">{userPlayer.player.points} pts</span>
                </div>
                <div className="player-meta">
                  <span className="player-theme">{userPlayer.player.theme}</span>
                  <span className="acquired-date">
                    {new Date(userPlayer.acquiredAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="card-actions">
                <button 
                  className="btn btn-small btn-secondary"
                  onClick={handleNavigateToTeamBuilder}
                  title={t('pages.collection.use_in_team')}
                >
                  ⚽
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {userPlayers.length > 0 && (
        <div className="collection-footer">
          <div className="color-distribution">
            <h4>{t('pages.collection.color_distribution')}</h4>
            <div className="color-bars">
              {Object.entries(stats.colorDistribution).map(([color, count]) => (
                <div key={color} className="color-bar">
                  <div 
                    className="color-indicator"
                    style={{ backgroundColor: `var(--color-${color})` }}
                  />
                  <span className="color-name">{color}</span>
                  <span className="color-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionPage;