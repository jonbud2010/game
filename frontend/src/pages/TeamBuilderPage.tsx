import React, { useState, useEffect, useCallback } from 'react';
import { apiService, type Team, type Formation, type Player } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface UserPlayer {
  id: string;
  playerId: string;
  acquiredAt: string;
  player: Player;
}

interface TeamPlayer {
  positionId: string;
  playerId: string | null;
  player?: Player;
}

const TeamBuilderPage: React.FC = () => {
  const { user } = useAuth();
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [selectedLobbyId, setSelectedLobbyId] = useState<string>('');
  const [selectedMatchDay, setSelectedMatchDay] = useState<number>(1);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [selectedFormationId, setSelectedFormationId] = useState<string>('');
  const [userPlayers, setUserPlayers] = useState<UserPlayer[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [teamName, setTeamName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load user's lobbies
        const lobbiesResponse = await apiService.getLobbies();
        if (lobbiesResponse.success && lobbiesResponse.data) {
          const userLobbies = lobbiesResponse.data.filter((lobby: any) => 
            lobby.members.some((member: any) => member.userId === user?.id)
          );
          setLobbies(userLobbies);
          if (userLobbies.length > 0 && !selectedLobbyId) {
            setSelectedLobbyId(userLobbies[0].id);
          }
        }

        // Load formations
        const formationsResponse = await apiService.getFormations();
        if (formationsResponse.success && formationsResponse.data) {
          setFormations(formationsResponse.data);
          if (formationsResponse.data.length > 0 && !selectedFormationId) {
            setSelectedFormationId(formationsResponse.data[0].id);
          }
        }

        // Load user's players
        await loadUserPlayers();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // Load user's collection
  const loadUserPlayers = async () => {
    try {
      // This would need to be implemented in the API service
      // For now, we'll use a placeholder
      setUserPlayers([]);
    } catch (err) {
      console.error('Failed to load user players:', err);
    }
  };

  // Load existing team when lobby/matchday changes
  useEffect(() => {
    if (selectedLobbyId && selectedMatchDay) {
      loadExistingTeam();
    }
  }, [selectedLobbyId, selectedMatchDay]);

  const loadExistingTeam = async () => {
    try {
      const response = await apiService.getUserTeams(selectedLobbyId);
      if (response.success && response.data) {
        const existingTeam = response.data.find((team: Team) => team.matchDay === selectedMatchDay);
        if (existingTeam) {
          setCurrentTeam(existingTeam);
          setTeamName(existingTeam.name);
          setSelectedFormationId(existingTeam.formationId);
          
          // Convert team players to the format we need
          const players: TeamPlayer[] = Array(11).fill(null).map((_, index) => {
            const teamPlayer = existingTeam.teamPlayers?.find(tp => tp.position === index);
            return {
              positionId: `pos-${index}`,
              playerId: teamPlayer?.playerId || null,
              player: teamPlayer?.player
            };
          });
          setTeamPlayers(players);
        } else {
          // No existing team, initialize empty formation
          initializeEmptyTeam();
        }
      }
    } catch (err) {
      console.error('Failed to load existing team:', err);
      initializeEmptyTeam();
    }
  };

  const initializeEmptyTeam = () => {
    setCurrentTeam(null);
    setTeamName(`${user?.username}'s Team`);
    setTeamPlayers(Array(11).fill(null).map((_, index) => ({
      positionId: `pos-${index}`,
      playerId: null,
      player: undefined
    })));
  };

  // Formation positions (this would ideally come from formation data)
  const getFormationPositions = () => {
    // Default 4-4-2 formation positions
    return [
      { id: 'pos-0', x: 50, y: 10, position: 'GK' },
      { id: 'pos-1', x: 20, y: 25, position: 'LB' },
      { id: 'pos-2', x: 35, y: 25, position: 'CB' },
      { id: 'pos-3', x: 65, y: 25, position: 'CB' },
      { id: 'pos-4', x: 80, y: 25, position: 'RB' },
      { id: 'pos-5', x: 20, y: 50, position: 'LM' },
      { id: 'pos-6', x: 40, y: 50, position: 'CM' },
      { id: 'pos-7', x: 60, y: 50, position: 'CM' },
      { id: 'pos-8', x: 80, y: 50, position: 'RM' },
      { id: 'pos-9', x: 35, y: 75, position: 'ST' },
      { id: 'pos-10', x: 65, y: 75, position: 'ST' }
    ];
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, player: Player) => {
    setDraggedPlayer(player);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, positionIndex: number) => {
    e.preventDefault();
    if (!draggedPlayer) return;

    // Check if player is already in the team
    const existingPosition = teamPlayers.findIndex(tp => tp.playerId === draggedPlayer.id);
    
    // Update team players
    const newTeamPlayers = [...teamPlayers];
    
    // Remove player from existing position if they were already placed
    if (existingPosition !== -1) {
      newTeamPlayers[existingPosition] = {
        positionId: `pos-${existingPosition}`,
        playerId: null,
        player: undefined
      };
    }
    
    // Add player to new position
    newTeamPlayers[positionIndex] = {
      positionId: `pos-${positionIndex}`,
      playerId: draggedPlayer.id,
      player: draggedPlayer
    };
    
    setTeamPlayers(newTeamPlayers);
    setDraggedPlayer(null);
  };

  const handleRemovePlayer = (positionIndex: number) => {
    const newTeamPlayers = [...teamPlayers];
    newTeamPlayers[positionIndex] = {
      positionId: `pos-${positionIndex}`,
      playerId: null,
      player: undefined
    };
    setTeamPlayers(newTeamPlayers);
  };

  const handleSaveTeam = async () => {
    if (!selectedLobbyId || !selectedFormationId || !teamName.trim()) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const players = teamPlayers.map((tp, index) => ({
        playerId: tp.playerId || '',
        points: tp.player?.points || 0,
        color: tp.player?.color || ''
      }));

      const teamData = {
        lobbyId: selectedLobbyId,
        formationId: selectedFormationId,
        name: teamName,
        matchDay: selectedMatchDay,
        players
      };

      let response;
      if (currentTeam) {
        response = await apiService.updateTeam(currentTeam.id, {
          name: teamName,
          players
        });
      } else {
        response = await apiService.createTeam(teamData);
      }

      if (response.success) {
        setCurrentTeam(response.data);
        setError(null);
        // Show success message or redirect
      } else {
        setError(response.error || 'Failed to save team');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save team');
    } finally {
      setSaving(false);
    }
  };

  const calculateTeamStats = () => {
    const playersInTeam = teamPlayers.filter(tp => tp.player);
    const totalPoints = playersInTeam.reduce((sum, tp) => sum + (tp.player?.points || 0), 0);
    const filledPositions = playersInTeam.length;
    
    // Simple chemistry calculation (would use actual chemistry utils in practice)
    const colors = new Map();
    playersInTeam.forEach(tp => {
      if (tp.player?.color) {
        colors.set(tp.player.color, (colors.get(tp.player.color) || 0) + 1);
      }
    });
    
    let chemistryPoints = 0;
    for (const [color, count] of colors) {
      if (count >= 2) {
        chemistryPoints += count * count; // Simplified chemistry calculation
      }
    }

    return { totalPoints, chemistryPoints, filledPositions };
  };

  const stats = calculateTeamStats();
  const formationPositions = getFormationPositions();

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading team builder...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Team Builder</h1>
        <p>Build your team for the upcoming matches</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="team-builder-container">
        {/* Controls */}
        <div className="team-controls">
          <div className="control-group">
            <label htmlFor="lobby-select">Lobby:</label>
            <select
              id="lobby-select"
              value={selectedLobbyId}
              onChange={(e) => setSelectedLobbyId(e.target.value)}
            >
              <option value="">Select Lobby</option>
              {lobbies.map(lobby => (
                <option key={lobby.id} value={lobby.id}>
                  {lobby.name}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="matchday-select">Match Day:</label>
            <select
              id="matchday-select"
              value={selectedMatchDay}
              onChange={(e) => setSelectedMatchDay(Number(e.target.value))}
            >
              {[1, 2, 3].map(day => (
                <option key={day} value={day}>
                  Match Day {day}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="formation-select">Formation:</label>
            <select
              id="formation-select"
              value={selectedFormationId}
              onChange={(e) => setSelectedFormationId(e.target.value)}
            >
              <option value="">Select Formation</option>
              {formations.map(formation => (
                <option key={formation.id} value={formation.id}>
                  {formation.name}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="team-name">Team Name:</label>
            <input
              id="team-name"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
            />
          </div>
        </div>

        <div className="team-builder-main">
          {/* Formation Field */}
          <div className="formation-field">
            <div className="field-background">
              {formationPositions.map((pos, index) => {
                const teamPlayer = teamPlayers[index];
                return (
                  <div
                    key={pos.id}
                    className={`position-slot ${teamPlayer?.player ? 'filled' : 'empty'}`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    {teamPlayer?.player ? (
                      <div className="player-card in-formation">
                        <img
                          src={teamPlayer.player.imageUrl || '/images/players/default.jpg'}
                          alt={teamPlayer.player.name}
                          className="player-image"
                        />
                        <div className="player-info">
                          <div className="player-name">{teamPlayer.player.name}</div>
                          <div className="player-points">{teamPlayer.player.points}pts</div>
                        </div>
                        <button
                          className="remove-player"
                          onClick={() => handleRemovePlayer(index)}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="empty-position">
                        <div className="position-label">{pos.position}</div>
                        <div className="drop-hint">Drop player here</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Player Collection */}
          <div className="player-collection">
            <h3>Your Players</h3>
            <div className="players-grid">
              {userPlayers.map(up => (
                <div
                  key={up.id}
                  className="player-card draggable"
                  draggable
                  onDragStart={(e) => handleDragStart(e, up.player)}
                >
                  <img
                    src={up.player.imageUrl || '/images/players/default.jpg'}
                    alt={up.player.name}
                    className="player-image"
                  />
                  <div className="player-info">
                    <div className="player-name">{up.player.name}</div>
                    <div className="player-details">
                      <span className="player-position">{up.player.position}</span>
                      <span className="player-points">{up.player.points}pts</span>
                    </div>
                    <div 
                      className="player-color" 
                      style={{ backgroundColor: `var(--color-${up.player.color})` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Stats */}
        <div className="team-stats">
          <h3>Team Statistics</h3>
          <div className="stats-grid">
            <div className="stat">
              <label>Players:</label>
              <span>{stats.filledPositions}/11</span>
            </div>
            <div className="stat">
              <label>Total Points:</label>
              <span>{stats.totalPoints}</span>
            </div>
            <div className="stat">
              <label>Chemistry:</label>
              <span>{stats.chemistryPoints}</span>
            </div>
            <div className="stat">
              <label>Team Strength:</label>
              <span>{stats.totalPoints + stats.chemistryPoints}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="team-actions">
          <button
            className="btn btn-primary"
            onClick={handleSaveTeam}
            disabled={saving || stats.filledPositions !== 11}
          >
            {saving ? 'Saving...' : currentTeam ? 'Update Team' : 'Create Team'}
          </button>
          
          {currentTeam && (
            <button
              className="btn btn-secondary"
              onClick={() => {/* Validate team */}}
            >
              Validate Team
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamBuilderPage;