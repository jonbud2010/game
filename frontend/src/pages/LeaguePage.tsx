import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiService, LeagueStatus, Match, LeagueTableEntry } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const LeaguePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const lobbyId = searchParams.get('lobbyId');
  
  const [leagueStatus, setLeagueStatus] = useState<LeagueStatus | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchDay, setSelectedMatchDay] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!lobbyId) {
      navigate('/lobby');
      return;
    }
    loadLeagueData();
  }, [lobbyId, navigate]);

  const loadLeagueData = async () => {
    if (!lobbyId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [statusResponse, matchesResponse] = await Promise.all([
        apiService.getLeagueStatus(lobbyId),
        apiService.getLobbyMatches(lobbyId)
      ]);

      if (statusResponse.success && statusResponse.data) {
        setLeagueStatus(statusResponse.data);
      }

      if (matchesResponse.success && matchesResponse.data) {
        setMatches(matchesResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Liga-Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeague = async () => {
    if (!lobbyId) return;
    
    try {
      setSimulating(true);
      const response = await apiService.createLeague(lobbyId);
      
      if (response.success) {
        await loadLeagueData();
      } else {
        setError('Fehler beim Erstellen der Liga');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen der Liga');
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulateLeague = async () => {
    if (!lobbyId) return;
    
    try {
      setSimulating(true);
      const response = await apiService.simulateEntireLeague(lobbyId);
      
      if (response.success) {
        await loadLeagueData();
      } else {
        setError('Fehler beim Simulieren der Liga');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Simulieren der Liga');
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulateMatch = async (matchId: string) => {
    try {
      const response = await apiService.simulateMatch(matchId);
      
      if (response.success) {
        await loadLeagueData();
      } else {
        setError('Fehler beim Simulieren des Spiels');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Simulieren des Spiels');
    }
  };

  const filteredMatches = selectedMatchDay === 'all' 
    ? matches 
    : matches.filter(match => match.matchDay === selectedMatchDay);

  const getMatchStatus = (match: Match) => {
    if (match.played) {
      return `${match.homeScore}:${match.awayScore}`;
    }
    return 'Ausstehend';
  };

  const getPositionBadge = (position: number) => {
    const colors = {
      1: 'bg-yellow-500 text-white', // Gold
      2: 'bg-gray-400 text-white',   // Silber
      3: 'bg-yellow-700 text-white', // Bronze
      4: 'bg-red-500 text-white'     // 4. Platz
    };
    
    return colors[position as keyof typeof colors] || 'bg-gray-200 text-gray-800';
  };

  const getRewardForPosition = (position: number) => {
    const rewards = { 1: 250, 2: 200, 3: 150, 4: 100 };
    return rewards[position as keyof typeof rewards] || 0;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Liga-Daten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>❌ {error}</p>
          <button 
            onClick={loadLeagueData}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Liga-Verwaltung</h1>
        <button 
          onClick={() => navigate('/lobby')}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Zurück zu Lobbies
        </button>
      </div>

      {/* Liga Status Overview */}
      {leagueStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-100 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Status</h3>
            <p className="text-2xl font-bold text-blue-600">
              {leagueStatus.lobbyStatus === 'WAITING' && 'Wartend'}
              {leagueStatus.lobbyStatus === 'IN_PROGRESS' && 'Läuft'}
              {leagueStatus.lobbyStatus === 'FINISHED' && 'Beendet'}
            </p>
          </div>
          
          <div className="bg-green-100 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Spiele gespielt</h3>
            <p className="text-2xl font-bold text-green-600">
              {leagueStatus.playedMatches}/{leagueStatus.totalMatches}
            </p>
          </div>
          
          <div className="bg-purple-100 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">Aktueller Spieltag</h3>
            <p className="text-2xl font-bold text-purple-600">
              {leagueStatus.currentMatchDay}/3
            </p>
          </div>
          
          <div className="bg-orange-100 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-800">Fortschritt</h3>
            <p className="text-2xl font-bold text-orange-600">
              {leagueStatus.totalMatches > 0 
                ? Math.round((leagueStatus.playedMatches / leagueStatus.totalMatches) * 100)
                : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Liga Aktionen */}
      <div className="mb-8 flex gap-4">
        {leagueStatus?.totalMatches === 0 && (
          <button
            onClick={handleCreateLeague}
            disabled={simulating}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {simulating ? 'Erstelle Liga...' : '🏆 Liga erstellen'}
          </button>
        )}
        
        {leagueStatus && leagueStatus.remainingMatches > 0 && (
          <button
            onClick={handleSimulateLeague}
            disabled={simulating}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {simulating ? 'Simuliere...' : '⚽ Komplette Liga simulieren'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Liga-Tabelle */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Liga-Tabelle</h2>
          
          {leagueStatus?.leagueTable.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-1">Pos</th>
                    <th className="text-left py-2 px-2">Spieler</th>
                    <th className="text-center py-2 px-1">S</th>
                    <th className="text-center py-2 px-1">Pkt</th>
                    <th className="text-center py-2 px-1">Tore</th>
                    <th className="text-center py-2 px-1">Diff</th>
                    {leagueStatus.leagueComplete && <th className="text-center py-2 px-1">Belohnung</th>}
                  </tr>
                </thead>
                <tbody>
                  {leagueStatus.leagueTable.map((entry) => (
                    <tr 
                      key={entry.id} 
                      className={`border-b border-gray-100 ${
                        entry.user.id === user?.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="py-2 px-1">
                        <span className={`inline-block w-6 h-6 rounded-full text-xs font-bold text-center leading-6 ${getPositionBadge(entry.position)}`}>
                          {entry.position}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-medium">
                        {entry.user.username}
                        {entry.user.id === user?.id && <span className="text-blue-600 ml-1">(Du)</span>}
                      </td>
                      <td className="text-center py-2 px-1">{entry.matches}</td>
                      <td className="text-center py-2 px-1 font-bold">{entry.points}</td>
                      <td className="text-center py-2 px-1">{entry.goalsFor}:{entry.goalsAgainst}</td>
                      <td className={`text-center py-2 px-1 ${entry.goalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.goalDifference >= 0 ? '+' : ''}{entry.goalDifference}
                      </td>
                      {leagueStatus.leagueComplete && (
                        <td className="text-center py-2 px-1 font-bold text-yellow-600">
                          {getRewardForPosition(entry.position)} 🪙
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Keine Liga-Tabelle verfügbar. Erstelle zuerst eine Liga.
            </p>
          )}
        </div>

        {/* Spielplan */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Spielplan</h2>
            <select 
              value={selectedMatchDay}
              onChange={(e) => setSelectedMatchDay(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="all">Alle Spieltage</option>
              <option value={1}>Spieltag 1</option>
              <option value={2}>Spieltag 2</option>
              <option value={3}>Spieltag 3</option>
            </select>
          </div>

          {filteredMatches.length ? (
            <div className="space-y-3">
              {filteredMatches.map((match) => (
                <div 
                  key={match.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 cursor-pointer" onClick={() => navigate(`/match/${match.id}`)}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Spieltag {match.matchDay}
                        </span>
                        <span className={`text-sm font-bold ${
                          match.played ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {getMatchStatus(match)}
                        </span>
                      </div>
                      
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {match.homeTeam?.name || `Team ${match.homeTeamId.slice(-4)}`}
                          </span>
                          <span className="mx-2">vs</span>
                          <span className="font-medium">
                            {match.awayTeam?.name || `Team ${match.awayTeamId.slice(-4)}`}
                          </span>
                        </div>
                      </div>
                      {match.played && (
                        <p className="text-xs text-blue-600 mt-1">📊 Details anzeigen</p>
                      )}
                    </div>
                    
                    <div className="ml-4 flex gap-2">
                      {!match.played && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSimulateMatch(match.id);
                          }}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          Simulieren
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/match/${match.id}`);
                        }}
                        className="bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Keine Spiele verfügbar. Erstelle zuerst eine Liga.
            </p>
          )}
        </div>
      </div>

      {/* Spieltag-Fortschritt */}
      {leagueStatus?.matchdayProgress && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Spieltag-Fortschritt</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leagueStatus.matchdayProgress.map((progress) => (
              <div 
                key={progress.matchDay}
                className={`border-2 rounded-lg p-4 ${
                  progress.completed 
                    ? 'border-green-300 bg-green-50' 
                    : progress.played > 0 
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Spieltag {progress.matchDay}</h3>
                  <span className={`text-sm px-2 py-1 rounded ${
                    progress.completed 
                      ? 'bg-green-200 text-green-800' 
                      : progress.played > 0 
                        ? 'bg-orange-200 text-orange-800'
                        : 'bg-gray-200 text-gray-800'
                  }`}>
                    {progress.completed ? 'Abgeschlossen' : progress.played > 0 ? 'Laufend' : 'Ausstehend'}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>Spiele: {progress.played}/{progress.total}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${
                        progress.completed ? 'bg-green-500' : 'bg-orange-500'
                      }`}
                      style={{ 
                        width: `${progress.total > 0 ? (progress.played / progress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaguePage;