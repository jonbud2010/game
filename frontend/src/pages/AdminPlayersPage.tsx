import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { apiService, Player } from '../services/api';

const AdminPlayersPage: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    points: 75,
    position: 'ST',
    color: 'RED',
    marketPrice: 100,
    theme: '',
    percentage: 0.05,
    image: null as File | null
  });

  const positions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'LF', 'RF'];
  const colors = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE', 'PINK', 'CYAN', 'LIME', 'INDIGO'];

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const data = await apiService.getPlayers();
      setPlayers(data.data || []);
    } catch (err) {
      console.error('fetchPlayers error:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    
    try {
      const formDataToSend = new FormData();
      
      // Add form fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('points', formData.points.toString());
      formDataToSend.append('position', formData.position);
      formDataToSend.append('color', formData.color);
      formDataToSend.append('marketPrice', formData.marketPrice.toString());
      formDataToSend.append('theme', formData.theme);
      formDataToSend.append('percentage', formData.percentage.toString());
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      if (editingPlayer) {
        await apiService.updatePlayer(editingPlayer.id, formDataToSend);
      } else {
        await apiService.createPlayer(formDataToSend);
      }

      // Reset form and refresh list
      setFormData({
        name: '',
        points: 75,
        position: 'ST',
        color: 'RED',
        marketPrice: 100,
        theme: '',
        percentage: 0.05,
        image: null
      });
      setShowCreateForm(false);
      setEditingPlayer(null);
      await fetchPlayers();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    }
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      points: player.points,
      position: player.position,
      color: player.color,
      marketPrice: player.marketPrice,
      theme: player.theme,
      percentage: player.percentage,
      image: null
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (playerId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diesen Spieler löschen möchten?')) {
      return;
    }

    try {
      await apiService.deletePlayer(playerId);
      await fetchPlayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Lade Spieler...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-players">
      <div className="container">
        <div className="admin-header">
          <div className="admin-breadcrumb">
            <Link to={ROUTES.ADMIN}>Admin</Link> &gt; Spieler verwalten
          </div>
          <h1>Spieler verwalten</h1>
          <div className="admin-actions">
            <button 
              className="btn btn-primary"
              onClick={() => {
                setShowCreateForm(true);
                setEditingPlayer(null);
                setFormData({
                  name: '',
                  points: 75,
                  position: 'ST',
                  color: 'RED',
                  marketPrice: 100,
                  theme: '',
                  percentage: 0.05,
                  image: null
                });
              }}
            >
              Neuen Spieler erstellen
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {showCreateForm && (
          <div className="form-modal">
            <div className="form-modal-content">
              <h2>{editingPlayer ? 'Spieler bearbeiten' : 'Neuen Spieler erstellen'}</h2>
              <form onSubmit={handleSubmit} className="player-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Name *</label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="theme">Thema *</label>
                    <input
                      id="theme"
                      type="text"
                      value={formData.theme}
                      onChange={(e) => setFormData({...formData, theme: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="points">Punkte *</label>
                    <input
                      id="points"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.points}
                      onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="marketPrice">Marktpreis *</label>
                    <input
                      id="marketPrice"
                      type="number"
                      min="1"
                      value={formData.marketPrice}
                      onChange={(e) => setFormData({...formData, marketPrice: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="position">Position *</label>
                    <select
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                      required
                    >
                      {positions.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="color">Farbe *</label>
                    <select
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      required
                    >
                      {colors.map(color => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="percentage">Pack-Wahrscheinlichkeit *</label>
                    <input
                      id="percentage"
                      type="number"
                      min="0.001"
                      max="1"
                      step="0.001"
                      value={formData.percentage}
                      onChange={(e) => setFormData({...formData, percentage: parseFloat(e.target.value) || 0.05})}
                      required
                    />
                    <small>Wert zwischen 0.001 (0.1%) und 1 (100%)</small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="image">Spielerbild</label>
                    <input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({...formData, image: e.target.files?.[0] || null})}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                    Abbrechen
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingPlayer ? 'Speichern' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="players-list">
          <div className="list-header">
            <h2>Alle Spieler ({players.length})</h2>
          </div>
          
          {players.length === 0 ? (
            <div className="empty-state">
              <p>Noch keine Spieler erstellt.</p>
            </div>
          ) : (
            <div className="players-table">
              <table>
                <thead>
                  <tr>
                    <th>Bild</th>
                    <th>Name</th>
                    <th>Position</th>
                    <th>Punkte</th>
                    <th>Farbe</th>
                    <th>Preis</th>
                    <th>Thema</th>
                    <th>%</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => (
                    <tr key={player.id}>
                      <td>
                        <img 
                          src={player.imageUrl} 
                          alt={player.name}
                          className="player-image-small"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/players/default.jpg';
                          }}
                        />
                      </td>
                      <td className="player-name">{player.name}</td>
                      <td className="player-position">{player.position}</td>
                      <td className="player-points">{player.points}</td>
                      <td>
                        <span className={`color-badge color-${player.color.toLowerCase()}`}>
                          {player.color}
                        </span>
                      </td>
                      <td className="player-price">{player.marketPrice}</td>
                      <td className="player-theme">{player.theme}</td>
                      <td className="player-percentage">{(player.percentage * 100).toFixed(1)}%</td>
                      <td className="player-actions">
                        <button 
                          className="btn btn-small btn-secondary"
                          onClick={() => handleEdit(player)}
                        >
                          Bearbeiten
                        </button>
                        <button 
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(player.id)}
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPlayersPage;