import React, { useState, useEffect, useCallback } from 'react';
import { apiService, type Team, type Formation, type Player, type UserPlayer } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { canPlayerBePlacedAtPosition, type PlayerPosition } from '@football-tcg/shared';
// Note: Chemistry utilities need to be properly exported from shared package

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
            setSelectedLobbyId(userLobbies[0]?.id || '');
          }
        }

        // Load formations
        const formationsResponse = await apiService.getFormations();
        if (formationsResponse.success && formationsResponse.data) {
          setFormations(formationsResponse.data);
          if (formationsResponse.data.length > 0 && !selectedFormationId) {
            setSelectedFormationId(formationsResponse.data[0]?.id || '');
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
      const response = await apiService.getUserCollection();
      if (response.success && response.data) {
        setUserPlayers(response.data);
      }
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

  // Get formation positions from selected formation data
  const getFormationPositions = () => {
    if (!selectedFormationId) {
      // Default 4-4-2 formation positions as fallback
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
    }

    const selectedFormation = formations.find(f => f.id === selectedFormationId);
    if (selectedFormation?.positions && Array.isArray(selectedFormation.positions)) {
      return selectedFormation.positions.map((pos, index) => ({
        id: `pos-${index}`,
        x: pos.x,
        y: pos.y,
        position: pos.position
      }));
    }

    // Fallback to default if formation data is invalid
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

  const handleDragOver = (e: React.DragEvent, positionIndex?: number) => {
    e.preventDefault();
    
    // Check if this is a valid drop zone for the dragged player
    if (draggedPlayer && positionIndex !== undefined) {
      const formationPositions = getFormationPositions();
      const targetFormationPosition = formationPositions[positionIndex]?.position as PlayerPosition;
      const playerPosition = draggedPlayer.position as PlayerPosition;
      
      if (canPlayerBePlacedAtPosition(playerPosition, targetFormationPosition)) {
        e.dataTransfer.dropEffect = 'move';
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  // Get list of player names already in the team
  const getUnavailablePlayerNames = (): string[] => {
    return teamPlayers
      .filter(tp => tp.player)
      .map(tp => tp.player!.name);
  };

  // Check if a player is available for placement
  const isPlayerAvailable = (player: Player): boolean => {
    const unavailableNames = getUnavailablePlayerNames();
    return !unavailableNames.includes(player.name);
  };

  // Check if a formation position is valid for the currently dragged player
  const isValidDropZone = (positionIndex: number): boolean => {
    if (!draggedPlayer) return true;
    
    const formationPositions = getFormationPositions();
    const targetFormationPosition = formationPositions[positionIndex]?.position as PlayerPosition;
    const playerPosition = draggedPlayer.position as PlayerPosition;
    
    return canPlayerBePlacedAtPosition(playerPosition, targetFormationPosition);
  };

  const handleDrop = (e: React.DragEvent, positionIndex: number) => {
    e.preventDefault();
    if (!draggedPlayer) return;

    // Check if player name is already in the team (unless it's the same player being moved)
    const existingPosition = teamPlayers.findIndex(tp => tp.playerId === draggedPlayer.id);
    const isMovingExistingPlayer = existingPosition !== -1;
    
    if (!isMovingExistingPlayer && !isPlayerAvailable(draggedPlayer)) {
      setError(`Spieler "${draggedPlayer.name}" ist bereits im Team. Jeder Spieler kann nur einmal verwendet werden.`);
      setDraggedPlayer(null);
      return;
    }

    // Check position compatibility
    const formationPositions = getFormationPositions();
    const targetFormationPosition = formationPositions[positionIndex]?.position as PlayerPosition;
    const playerPosition = draggedPlayer.position as PlayerPosition;
    
    if (!canPlayerBePlacedAtPosition(playerPosition, targetFormationPosition)) {
      setError(`Spieler "${draggedPlayer.name}" (${playerPosition}) kann nicht auf Position ${targetFormationPosition} eingesetzt werden.`);
      setDraggedPlayer(null);
      return;
    }

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
    
    // Clear any previous error messages
    if (error) {
      setError(null);
    }
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

      if (response.success && response.data) {
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
    
    // Calculate color distribution and chemistry points
    const colors = new Map<string, number>();
    playersInTeam.forEach(tp => {
      if (tp.player?.color) {
        const color = tp.player.color.toLowerCase();
        colors.set(color, (colors.get(color) || 0) + 1);
      }
    });
    
    let chemistryPoints = 0;
    const chemistryBreakdown: Array<{
      color: string;
      playerCount: number;
      bonus: number;
    }> = [];
    
    for (const [color, count] of colors) {
      if (count >= 2 && count <= 7) {
        const bonus = count * count; // Simplified: n² points per color
        chemistryPoints += bonus;
        chemistryBreakdown.push({ color, playerCount: count, bonus });
      }
    }
    
    // Validation rules: 11 players, exactly 3 colors, min 2 players per color
    const validationErrors: string[] = [];
    if (filledPositions === 11) {
      if (colors.size !== 3) {
        validationErrors.push(`Team muss genau 3 verschiedene Farben haben (aktuell: ${colors.size})`);
      }
      for (const [color, count] of colors) {
        if (count < 2) {
          validationErrors.push(`Farbe ${color} muss mindestens 2 Spieler haben (aktuell: ${count})`);
        }
      }
    }

    return { 
      totalPoints, 
      chemistryPoints, 
      filledPositions, 
      chemistryBreakdown: chemistryBreakdown.sort((a, b) => b.bonus - a.bonus),
      validationErrors,
      isValidTeam: filledPositions === 11 && validationErrors.length === 0
    };
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
                const isValidDrop = isValidDropZone(index);
                return (
                  <div
                    key={pos.id}
                    className={`position-slot ${teamPlayer?.player ? 'filled' : 'empty'} ${
                      draggedPlayer ? (isValidDrop ? 'valid-drop' : 'invalid-drop') : ''
                    }`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    onDragOver={(e) => handleDragOver(e, index)}
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
            <h3>Your Players ({userPlayers.length})</h3>
            {userPlayers.length === 0 ? (
              <div className="empty-collection">
                <p>🃏 No players in your collection</p>
                <p><small>Open packs to collect players!</small></p>
                <button 
                  className="btn btn-primary"
                  onClick={() => window.location.href = '/pack-store'}
                >
                  Go to Pack Store
                </button>
              </div>
            ) : (
              <div className="players-grid">
                {userPlayers.map(up => {
                  const isInTeam = teamPlayers.some(tp => tp.playerId === up.player.id);
                  const isUnavailable = !isPlayerAvailable(up.player) && !isInTeam;
                  const unavailableNames = getUnavailablePlayerNames();
                  const conflictingName = isUnavailable ? unavailableNames.find(name => name === up.player.name) : null;
                  
                  return (
                    <div
                      key={up.id}
                      className={`player-card draggable ${
                        isInTeam ? 'in-team' : isUnavailable ? 'unavailable' : ''
                      }`}
                      draggable={!isUnavailable}
                      onDragStart={(e) => {
                        if (isUnavailable) {
                          e.preventDefault();
                          return;
                        }
                        handleDragStart(e, up.player);
                      }}
                      title={
                        isInTeam 
                          ? 'Already in team' 
                          : isUnavailable 
                            ? `Spieler "${up.player.name}" ist bereits im Team` 
                            : 'Drag to formation'
                      }
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
                          className="player-color-badge" 
                          style={{ backgroundColor: `var(--color-${up.player.color})` }}
                          title={up.player.color}
                        >
                          {up.player.color.substring(0, 1)}
                        </div>
                      </div>
                      {isInTeam && (
                        <div className="in-team-indicator">✓</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Team Stats */}
        <div className="team-stats">
          <h3>Team Statistics</h3>
          <div className="stats-grid">
            <div className="stat">
              <label>Players:</label>
              <span className={stats.filledPositions === 11 ? 'complete' : 'incomplete'}>
                {stats.filledPositions}/11
              </span>
            </div>
            <div className="stat">
              <label>Total Points:</label>
              <span>{stats.totalPoints}</span>
            </div>
            <div className="stat">
              <label>Chemistry:</label>
              <span className={stats.chemistryPoints > 0 ? 'positive' : ''}>
                {stats.chemistryPoints}
              </span>
            </div>
            <div className="stat">
              <label>Team Strength:</label>
              <span className="team-strength">
                {stats.totalPoints + stats.chemistryPoints}
              </span>
            </div>
          </div>
          
          {stats.validationErrors && stats.validationErrors.length > 0 && (
            <div className="chemistry-errors">
              <h4>⚠️ Chemistry Issues:</h4>
              <ul>
                {stats.validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {stats.chemistryBreakdown && stats.chemistryBreakdown.length > 0 && (
            <div className="chemistry-breakdown">
              <h4>Chemistry Bonuses:</h4>
              <div className="chemistry-bonuses">
                {stats.chemistryBreakdown.map((bonus, index) => (
                  <div key={index} className="chemistry-bonus">
                    <div 
                      className="color-indicator" 
                      style={{ backgroundColor: `var(--color-${bonus.color})` }}
                    />
                    <span className="color-name">{bonus.color}</span>
                    <span className="player-count">{bonus.playerCount} players</span>
                    <span className="bonus-points">+{bonus.bonus}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {stats.isValidTeam && (
            <div className="team-valid-indicator">
              ✅ Team is valid and ready to play!
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="team-actions">
          <button
            className="btn btn-primary"
            onClick={handleSaveTeam}
            disabled={saving || !stats.isValidTeam}
            title={!stats.isValidTeam ? 'Complete team with valid chemistry to save' : ''}
          >
            {saving ? 'Saving...' : currentTeam ? 'Update Team' : 'Create Team'}
          </button>
          
          {!stats.isValidTeam && stats.filledPositions > 0 && (
            <div className="team-validation-help">
              <small>
                {stats.filledPositions < 11 
                  ? `Add ${11 - stats.filledPositions} more players` 
                  : 'Fix chemistry issues to save team'
                }
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamBuilderPage;