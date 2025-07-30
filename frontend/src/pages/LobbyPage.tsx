import React, { useState, useEffect } from 'react';
import { apiService, type Lobby } from '../services/api';

const LobbyPage: React.FC = () => {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLobbyName, setNewLobbyName] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadLobbies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getLobbies();
      if (response.success && response.data) {
        setLobbies(response.data);
      } else {
        setError(response.error || 'Failed to load lobbies');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lobbies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLobbyName.trim()) return;

    try {
      setActionLoading('create');
      const response = await apiService.createLobby({ name: newLobbyName.trim() });
      if (response.success) {
        setShowCreateModal(false);
        setNewLobbyName('');
        await loadLobbies(); // Reload lobbies to show the new one
      } else {
        setError(response.error || 'Failed to create lobby');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lobby');
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoinLobby = async (lobbyId: string) => {
    try {
      setActionLoading(lobbyId);
      const response = await apiService.joinLobby(lobbyId);
      if (response.success) {
        await loadLobbies(); // Reload to show updated lobby
      } else {
        setError(response.error || 'Failed to join lobby');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join lobby');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusText = (status: Lobby['status']) => {
    switch (status) {
      case 'WAITING': return 'Warten auf Spieler';
      case 'IN_PROGRESS': return 'Spiel läuft';
      case 'FINISHED': return 'Beendet';
      default: return status;
    }
  };

  const getStatusClass = (status: Lobby['status']) => {
    switch (status) {
      case 'WAITING': return 'waiting';
      case 'IN_PROGRESS': return 'in-progress';
      case 'FINISHED': return 'finished';
      default: return '';
    }
  };

  useEffect(() => {
    loadLobbies();
  }, []);

  return (
    <div className="lobby-page">
      <div className="page-header">
        <h1>🏟️ Lobbies</h1>
        <p>Tritt einer Lobby bei oder erstelle eine neue</p>
      </div>
      
      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      <div className="lobby-actions">
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          disabled={!!actionLoading}
        >
          {actionLoading === 'create' ? 'Erstelle...' : 'Neue Lobby erstellen'}
        </button>
        <button 
          className="btn btn-secondary"
          onClick={loadLobbies}
          disabled={loading}
        >
          {loading ? 'Lädt...' : 'Lobbies aktualisieren'}
        </button>
      </div>
      
      <div className="lobby-list">
        {loading ? (
          <div className="loading">
            <p>🔄 Lade Lobbies...</p>
          </div>
        ) : lobbies.length === 0 ? (
          <div className="no-lobbies">
            <p>📭 Keine Lobbies verfügbar</p>
            <p>Erstelle eine neue Lobby, um zu beginnen!</p>
          </div>
        ) : (
          lobbies.map(lobby => (
            <div key={lobby.id} className="lobby-item">
              <div className="lobby-info">
                <h3>{lobby.name}</h3>
                <p>{lobby.currentPlayers}/{lobby.maxPlayers} Spieler</p>
                <span className={`status ${getStatusClass(lobby.status)}`}>
                  {getStatusText(lobby.status)}
                </span>
              </div>
              <div className="lobby-members">
                <h4>Mitglieder:</h4>
                <ul>
                  {lobby.members.map(member => (
                    <li key={member.userId}>{member.username}</li>
                  ))}
                </ul>
              </div>
              <div className="lobby-actions">
                <button 
                  className="btn btn-small"
                  onClick={() => handleJoinLobby(lobby.id)}
                  disabled={
                    lobby.currentPlayers >= lobby.maxPlayers || 
                    lobby.status !== 'WAITING' ||
                    actionLoading === lobby.id
                  }
                >
                  {actionLoading === lobby.id ? 'Beitrete...' : 
                   lobby.currentPlayers >= lobby.maxPlayers ? 'Voll' : 
                   lobby.status !== 'WAITING' ? 'Nicht verfügbar' : 'Beitreten'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Lobby Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Neue Lobby erstellen</h2>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateLobby} className="modal-content">
              <div className="form-group">
                <label htmlFor="lobbyName">Lobby Name:</label>
                <input
                  id="lobbyName"
                  type="text"
                  value={newLobbyName}
                  onChange={(e) => setNewLobbyName(e.target.value)}
                  placeholder="z.B. Bundesliga Turnier"
                  maxLength={50}
                  required
                />
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={!!actionLoading}
                >
                  Abbrechen
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!newLobbyName.trim() || !!actionLoading}
                >
                  {actionLoading === 'create' ? 'Erstelle...' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;