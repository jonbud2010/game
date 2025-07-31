import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { apiService } from '../services/api';

interface Pack {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  status: string;
  playerCount: number;
  totalPercentage: number;
  players: PackPlayer[];
  createdAt: string;
  updatedAt: string;
}

interface PackPlayer {
  id: string;
  name: string;
  points: number;
  position: string;
  color: string;
  percentage: number;
}

interface Player {
  id: string;
  name: string;
  points: number;
  position: string;
  color: string;
  percentage: number;
}

const AdminPacksPage: React.FC = () => {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [showPlayerSelector, setShowPlayerSelector] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: 100,
    status: 'ACTIVE',
    image: null as File | null
  });

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  useEffect(() => {
    fetchPacks();
    fetchPlayers();
  }, []);

  const fetchPacks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/packs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Packs');
      }

      const data = await response.json();
      setPacks(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const data = await apiService.getPlayers();
      setPlayers(data.data || []);
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      
      formDataToSend.append('name', formData.name);
      formDataToSend.append('price', formData.price.toString());
      formDataToSend.append('status', formData.status);
      
      if (selectedPlayers.length > 0) {
        formDataToSend.append('playerIds', JSON.stringify(selectedPlayers));
      }
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      const response = await fetch(
        editingPack ? `/api/packs/${editingPack.id}` : '/api/packs',
        {
          method: editingPack ? 'PUT' : 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataToSend
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern');
      }

      // Reset form and refresh list
      setFormData({
        name: '',
        price: 100,
        status: 'ACTIVE',
        image: null
      });
      setSelectedPlayers([]);
      setShowCreateForm(false);
      setEditingPack(null);
      await fetchPacks();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    }
  };

  const handleEdit = (pack: Pack) => {
    setEditingPack(pack);
    setFormData({
      name: pack.name,
      price: pack.price,
      status: pack.status,
      image: null
    });
    setSelectedPlayers(pack.players.map(p => p.id));
    setShowCreateForm(true);
  };

  const handleDelete = async (packId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Pack löschen möchten?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/packs/${packId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen');
      }

      await fetchPacks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  const handleManagePlayers = (packId: string) => {
    const pack = packs.find(p => p.id === packId);
    if (pack) {
      setSelectedPlayers(pack.players.map(p => p.id));
      setShowPlayerSelector(packId);
    }
  };

  const handleUpdatePackPlayers = async (packId: string) => {
    try {
      const token = localStorage.getItem('token');
      const pack = packs.find(p => p.id === packId);
      if (!pack) return;

      const currentPlayerIds = pack.players.map(p => p.id);
      const playersToAdd = selectedPlayers.filter(id => !currentPlayerIds.includes(id));
      const playersToRemove = currentPlayerIds.filter(id => !selectedPlayers.includes(id));

      // Add new players
      if (playersToAdd.length > 0) {
        const response = await fetch(`/api/packs/${packId}/players`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ playerIds: playersToAdd })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Fehler beim Hinzufügen von Spielern');
        }
      }

      // Remove players
      if (playersToRemove.length > 0) {
        const response = await fetch(`/api/packs/${packId}/players`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ playerIds: playersToRemove })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Fehler beim Entfernen von Spielern');
        }
      }

      setShowPlayerSelector(null);
      await fetchPacks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Spieler');
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(prev => prev.filter(id => id !== playerId));
    } else {
      setSelectedPlayers(prev => [...prev, playerId]);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Lade Packs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-packs">
      <div className="container">
        <div className="admin-header">
          <div className="admin-breadcrumb">
            <Link to={ROUTES.ADMIN}>Admin</Link> &gt; Packs verwalten
          </div>
          <h1>Packs verwalten</h1>
          <div className="admin-actions">
            <button 
              className="btn btn-primary"
              onClick={() => {
                setShowCreateForm(true);
                setEditingPack(null);
                setFormData({
                  name: '',
                  price: 100,
                  status: 'ACTIVE',
                  image: null
                });
                setSelectedPlayers([]);
              }}
            >
              Neues Pack erstellen
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
              <h2>{editingPack ? 'Pack bearbeiten' : 'Neues Pack erstellen'}</h2>
              <form onSubmit={handleSubmit} className="pack-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Pack Name *</label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="z.B. Starter Pack"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="price">Preis *</label>
                    <input
                      id="price"
                      type="number"
                      min="1"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="status">Status *</label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      required
                    >
                      <option value="ACTIVE">Aktiv</option>
                      <option value="INACTIVE">Inaktiv</option>
                      <option value="EMPTY">Leer</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="image">Pack Bild</label>
                    <input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({...formData, image: e.target.files?.[0] || null})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Spieler auswählen ({selectedPlayers.length} ausgewählt)</label>
                  <div className="players-selection">
                    {players.map(player => (
                      <div key={player.id} className="player-checkbox">
                        <input
                          type="checkbox"
                          id={`player-${player.id}`}
                          checked={selectedPlayers.includes(player.id)}
                          onChange={() => togglePlayerSelection(player.id)}
                        />
                        <label htmlFor={`player-${player.id}`}>
                          {player.name} ({player.position}, {player.points}P, {(player.percentage * 100).toFixed(1)}%)
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                    Abbrechen
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingPack ? 'Speichern' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showPlayerSelector && (
          <div className="form-modal">
            <div className="form-modal-content">
              <h2>Spieler für Pack verwalten</h2>
              <div className="players-selection">
                {players.map(player => (
                  <div key={player.id} className="player-checkbox">
                    <input
                      type="checkbox"
                      id={`player-${player.id}`}
                      checked={selectedPlayers.includes(player.id)}
                      onChange={() => togglePlayerSelection(player.id)}
                    />
                    <label htmlFor={`player-${player.id}`}>
                      {player.name} ({player.position}, {player.points}P, {(player.percentage * 100).toFixed(1)}%)
                    </label>
                  </div>
                ))}
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPlayerSelector(null)}
                >
                  Abbrechen
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => handleUpdatePackPlayers(showPlayerSelector)}
                >
                  Spieler aktualisieren
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="packs-list">
          <div className="list-header">
            <h2>Alle Packs ({packs.length})</h2>
          </div>
          
          {packs.length === 0 ? (
            <div className="empty-state">
              <p>Noch keine Packs erstellt.</p>
            </div>
          ) : (
            <div className="packs-grid">
              {packs.map(pack => (
                <div key={pack.id} className="pack-card">
                  <div className="pack-image">
                    <img 
                      src={pack.imageUrl} 
                      alt={pack.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/packs/default.jpg';
                      }}
                    />
                    <div className={`pack-status status-${pack.status.toLowerCase()}`}>
                      {pack.status}
                    </div>
                  </div>
                  <div className="pack-info">
                    <h3>{pack.name}</h3>
                    <div className="pack-details">
                      <div className="pack-price">{pack.price} Münzen</div>
                      <div className="pack-stats">
                        <span>{pack.playerCount} Spieler</span>
                        <span>{pack.totalPercentage.toFixed(1)}% Chance</span>
                      </div>
                    </div>
                    <div className="pack-players">
                      {pack.players.slice(0, 3).map(player => (
                        <span key={player.id} className="player-tag">
                          {player.name} ({player.position})
                        </span>
                      ))}
                      {pack.players.length > 3 && (
                        <span className="player-more">+{pack.players.length - 3}</span>
                      )}
                    </div>
                  </div>
                  <div className="pack-actions">
                    <button 
                      className="btn btn-small btn-secondary"
                      onClick={() => handleEdit(pack)}
                    >
                      Bearbeiten
                    </button>
                    <button 
                      className="btn btn-small btn-info"
                      onClick={() => handleManagePlayers(pack.id)}
                    >
                      Spieler
                    </button>
                    <button 
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(pack.id)}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPacksPage;