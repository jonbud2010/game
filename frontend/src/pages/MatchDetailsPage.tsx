import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService, Match, Team } from '../services/api';

interface MatchSimulation {
  events: Array<{
    minute: number;
    type: 'goal' | 'chance';
    team: 1 | 2;
    playerId?: string;
  }>;
  team1Chances: number;
  team2Chances: number;
  team1Percentage: number;
  team2Percentage: number;
}

interface TeamStrength {
  totalPoints: number;
  chemistryPoints: number;
  totalStrength: number;
  colorBreakdown: Array<{
    color: string;
    count: number;
    bonus: number;
  }>;
}

interface MatchDetails extends Match {
  simulation?: MatchSimulation;
  homeStrength?: TeamStrength;
  awayStrength?: TeamStrength;
}

const MatchDetailsPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!matchId) {
      navigate(-1);
      return;
    }
    loadMatchDetails();
  }, [matchId, navigate]);

  const loadMatchDetails = async () => {
    if (!matchId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getMatch(matchId);
      
      if (response.success && response.data) {
        setMatch(response.data);
      } else {
        setError('Match nicht gefunden');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Match-Details');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateMatch = async () => {
    if (!matchId) return;
    
    try {
      setSimulating(true);
      const response = await apiService.simulateMatch(matchId);
      
      if (response.success && response.data) {
        // Update match with simulation results
        setMatch(prev => prev ? {
          ...prev,
          ...response.data.match,
          simulation: response.data.simulation,
          homeStrength: response.data.homeStrength,
          awayStrength: response.data.awayStrength
        } : null);
      } else {
        setError('Fehler beim Simulieren des Matches');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Simulieren des Matches');
    } finally {
      setSimulating(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'goal': return '⚽';
      case 'chance': return '🎯';
      default: return '📝';
    }
  };

  const getTeamName = (team: Team | undefined, fallbackId: string) => {
    return team?.name || `Team ${fallbackId.slice(-4)}`;
  };

  const renderTeamStrength = (strength: TeamStrength | undefined, teamName: string) => {
    if (!strength) return null;

    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold mb-3">{teamName} - Team-Stärke</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-sm text-gray-600">Spieler-Punkte:</span>
            <p className="text-lg font-bold text-blue-600">{strength.totalPoints}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Chemie-Bonus:</span>
            <p className="text-lg font-bold text-green-600">+{strength.chemistryPoints}</p>
          </div>
        </div>
        
        <div className="mb-4">
          <span className="text-sm text-gray-600">Gesamt-Stärke:</span>
          <p className="text-xl font-bold text-purple-600">{strength.totalStrength}</p>
        </div>

        {strength.colorBreakdown && strength.colorBreakdown.length > 0 && (
          <div>
            <span className="text-sm text-gray-600 block mb-2">Farb-Chemie:</span>
            <div className="flex flex-wrap gap-2">
              {strength.colorBreakdown.map((color, index) => (
                <div 
                  key={index}
                  className="flex items-center bg-white rounded px-2 py-1 text-xs border"
                >
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: color.color }}
                  ></div>
                  <span>{color.count} Spieler (+{color.bonus})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Match-Details...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>❌ {error || 'Match nicht gefunden'}</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Match-Details</h1>
        <button 
          onClick={() => navigate(-1)}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Zurück
        </button>
      </div>

      {/* Match Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="text-center mb-4">
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
            Spieltag {match.matchDay}
          </span>
        </div>
        
        <div className="flex items-center justify-center space-x-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">
              {getTeamName(match.homeTeam, match.homeTeamId)}
            </h2>
            <p className="text-gray-600">Heim</p>
          </div>
          
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-800 bg-gray-100 rounded-lg px-6 py-4">
              {match.played ? (
                <span>
                  {match.homeScore} : {match.awayScore}
                </span>
              ) : (
                <span className="text-gray-400">- : -</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {match.played ? 'Gespielt' : 'Ausstehend'}
            </p>
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">
              {getTeamName(match.awayTeam, match.awayTeamId)}
            </h2>
            <p className="text-gray-600">Auswärts</p>
          </div>
        </div>
        
        {!match.played && (
          <div className="text-center mt-6">
            <button
              onClick={handleSimulateMatch}
              disabled={simulating}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {simulating ? 'Simuliere...' : '⚽ Match simulieren'}
            </button>
          </div>
        )}
      </div>

      {/* Team Strengths */}
      {(match.homeStrength || match.awayStrength) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            {renderTeamStrength(match.homeStrength, getTeamName(match.homeTeam, match.homeTeamId))}
          </div>
          <div>
            {renderTeamStrength(match.awayStrength, getTeamName(match.awayTeam, match.awayTeamId))}
          </div>
        </div>
      )}

      {/* Match Simulation */}
      {match.simulation && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Spiel-Simulation</h2>
          
          {/* Simulation Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-3">Torchancen</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{getTeamName(match.homeTeam, match.homeTeamId)}:</span>
                  <span className="font-bold">{match.simulation.team1Chances}</span>
                </div>
                <div className="flex justify-between">
                  <span>{getTeamName(match.awayTeam, match.awayTeamId)}:</span>
                  <span className="font-bold">{match.simulation.team2Chances}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-3">Erfolgswahrscheinlichkeit</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{getTeamName(match.homeTeam, match.homeTeamId)}:</span>
                  <span className="font-bold">{match.simulation.team1Percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>{getTeamName(match.awayTeam, match.awayTeamId)}:</span>
                  <span className="font-bold">{match.simulation.team2Percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Match Events */}
          {match.simulation.events && match.simulation.events.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4 text-gray-800">Spielverlauf</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {match.simulation.events
                    .sort((a, b) => a.minute - b.minute)
                    .map((event, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between p-2 rounded ${
                          event.type === 'goal' ? 'bg-green-100' : 'bg-blue-100'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-lg mr-3">{getEventIcon(event.type)}</span>
                          <div>
                            <span className="font-medium">
                              {event.team === 1 
                                ? getTeamName(match.homeTeam, match.homeTeamId)
                                : getTeamName(match.awayTeam, match.awayTeamId)
                              }
                            </span>
                            <span className="text-sm text-gray-600 ml-2">
                              ({event.type === 'goal' ? 'Tor' : 'Chance'})
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-mono bg-white px-2 py-1 rounded">
                          {event.minute}'
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Lineups */}
      {(match.homeTeam?.teamPlayers || match.awayTeam?.teamPlayers) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Home Team Lineup */}
          {match.homeTeam?.teamPlayers && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">
                {getTeamName(match.homeTeam, match.homeTeamId)} - Aufstellung
              </h2>
              <div className="space-y-2">
                {match.homeTeam.teamPlayers
                  .filter(tp => tp.player)
                  .map((teamPlayer, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: teamPlayer.color }}
                        ></div>
                        <div>
                          <span className="font-medium">{teamPlayer.player?.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({teamPlayer.player?.position})
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-blue-600">
                        {teamPlayer.points} Pkt
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Away Team Lineup */}
          {match.awayTeam?.teamPlayers && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">
                {getTeamName(match.awayTeam, match.awayTeamId)} - Aufstellung
              </h2>
              <div className="space-y-2">
                {match.awayTeam.teamPlayers
                  .filter(tp => tp.player)
                  .map((teamPlayer, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: teamPlayer.color }}
                        ></div>
                        <div>
                          <span className="font-medium">{teamPlayer.player?.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({teamPlayer.player?.position})
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-blue-600">
                        {teamPlayer.points} Pkt
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchDetailsPage;