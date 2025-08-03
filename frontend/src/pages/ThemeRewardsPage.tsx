import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import LoadingSpinner from '../components/LoadingSpinner';

interface ThemeStanding {
  theme: string;
  users: Array<{
    userId: string;
    username: string;
    highestPlayerPoints: number;
    highestPlayerName: string;
    rank: number;
    potentialReward: number;
  }>;
}

interface ThemeReward {
  id: string;
  theme: string;
  week: number;
  year: number;
  executedAt: Date;
  winners: Array<{
    id: string;
    userId: string;
    username: string;
    rank: number;
    points: number;
    coinsAwarded: number;
  }>;
}

const ThemeRewardsPage: React.FC = () => {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [currentStandings, setCurrentStandings] = useState<ThemeStanding[]>([]);
  const [rewardHistory, setRewardHistory] = useState<ThemeReward[]>([]);
  const [userSummary, setUserSummary] = useState<any>(null);
  const [nextExecution, setNextExecution] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'standings' | 'history' | 'summary'>('standings');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!lobbyId) {
      navigate('/lobbies');
      return;
    }
    loadThemeRewardData();
  }, [lobbyId, navigate]);

  const loadThemeRewardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [standingsResponse, historyResponse, summaryResponse] = await Promise.all([
        apiService.getCurrentThemeStandings(lobbyId!),
        apiService.getThemeRewardsHistory(lobbyId!, 1, 10),
        apiService.getUserThemeRewardSummary(lobbyId!)
      ]);

      if (standingsResponse.success && standingsResponse.data) {
        setCurrentStandings(standingsResponse.data.standings);
        setNextExecution(new Date(standingsResponse.data.nextExecution));
      }

      if (historyResponse.success && historyResponse.data) {
        setRewardHistory(historyResponse.data.themeRewards);
        setTotalPages(historyResponse.data.totalPages);
      }

      if (summaryResponse.success && summaryResponse.data) {
        setUserSummary(summaryResponse.data);
      }

    } catch (err) {
      console.error('Error loading theme reward data:', err);
      setError('Failed to load theme reward data');
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryPage = async (page: number) => {
    try {
      const response = await apiService.getThemeRewardsHistory(lobbyId!, page, 10);
      if (response.success && response.data) {
        setRewardHistory(response.data.themeRewards);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error('Error loading history page:', err);
    }
  };

  const formatThemeName = (theme: string): string => {
    const themeNames: { [key: string]: string } = {
      'TEN_D': '10D',
      'EIGHT_E': '8E',
      'ROWING': 'Rudern',
      'HP': 'Harry Potter',
      'FOOTBALL': 'Fußball',
      'MARVEL': 'Marvel'
    };
    return themeNames[theme] || theme;
  };

  const getRankBadgeClass = (rank: number): string => {
    switch (rank) {
      case 1: return 'bg-yellow-500 text-white';
      case 2: return 'bg-gray-400 text-white';
      case 3: return 'bg-amber-600 text-white';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Fehler</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="btn-primary"
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Thema Belohnungen</h1>
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary"
        >
          Zurück
        </button>
      </div>

      {nextExecution && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">Nächste Ausführung</h2>
          <p className="text-blue-700">
            🕐 {formatDate(nextExecution)} (Jeden Sonntag um 20:00 Berliner Zeit)
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Belohnungen basieren auf dem höchstbewerteten Spieler pro Thema in deiner Sammlung
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('standings')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'standings'
              ? 'bg-white shadow text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Aktuelle Rangliste
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'summary'
              ? 'bg-white shadow text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Meine Bilanz
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-white shadow text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Verlauf
        </button>
      </div>

      {/* Current Standings Tab */}
      {activeTab === 'standings' && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h2 className="font-semibold text-yellow-800 mb-2">💰 Belohnungsstruktur</h2>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1">1</div>
                <div className="font-medium">100 💰</div>
              </div>
              <div className="text-center">
                <div className="bg-gray-400 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1">2</div>
                <div className="font-medium">50 💰</div>
              </div>
              <div className="text-center">
                <div className="bg-amber-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1">3</div>
                <div className="font-medium">30 💰</div>
              </div>
              <div className="text-center">
                <div className="bg-gray-200 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1">4</div>
                <div className="font-medium">0 💰</div>
              </div>
            </div>
            <p className="text-sm text-yellow-700 mt-2 text-center">
              Maximal 600 💰 pro Woche möglich (6 Themen × 100 💰)
            </p>
          </div>

          <div className="grid gap-6">
            {currentStandings.map((themeStanding) => (
              <div key={themeStanding.theme} className="bg-white rounded-lg border shadow-sm">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="text-lg font-semibold">{formatThemeName(themeStanding.theme)}</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {themeStanding.users.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadgeClass(user.rank)}`}>
                            {user.rank}
                          </span>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-gray-600">
                              {user.highestPlayerName} • {user.highestPlayerPoints} Punkte
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {user.potentialReward > 0 ? `+${user.potentialReward} 💰` : '0 💰'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Summary Tab */}
      {activeTab === 'summary' && userSummary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-green-600">{userSummary.totalEarnings}</div>
              <div className="text-sm text-green-700">Gesamt verdient 💰</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-blue-600">{userSummary.totalWins}</div>
              <div className="text-sm text-blue-700">Gesamte Siege</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {userSummary.currentStandings.reduce((sum: number, standing: any) => sum + standing.potentialReward, 0)}
              </div>
              <div className="text-sm text-purple-700">Potenzielle Wochenbelohnung 💰</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Aktuelle Positionen</h3>
            </div>
            <div className="p-4">
              <div className="grid gap-3">
                {userSummary.currentStandings.map((standing: any) => (
                  <div key={standing.theme} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadgeClass(standing.rank)}`}>
                        {standing.rank}
                      </span>
                      <div>
                        <div className="font-medium">{formatThemeName(standing.theme)}</div>
                        <div className="text-sm text-gray-600">
                          {standing.playerName} • {standing.points} Punkte
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {standing.potentialReward > 0 ? `+${standing.potentialReward} 💰` : '0 💰'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {userSummary.recentWins.length > 0 && (
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Letzte Siege</h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {userSummary.recentWins.map((win: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankBadgeClass(win.rank)}`}>
                          {win.rank}
                        </span>
                        <div>
                          <span className="font-medium">{formatThemeName(win.theme)}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            KW {win.week}/{win.year}
                          </span>
                        </div>
                      </div>
                      <div className="text-green-600 font-semibold">+{win.coinsAwarded} 💰</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {rewardHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🏆</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Noch keine Belohnungen</h3>
              <p className="text-gray-500">Die ersten Thema-Belohnungen werden am nächsten Sonntag vergeben.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-6">
                {rewardHistory.map((reward) => (
                  <div key={reward.id} className="bg-white rounded-lg border shadow-sm">
                    <div className="p-4 border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{formatThemeName(reward.theme)}</h3>
                        <div className="text-sm text-gray-600">
                          KW {reward.week}/{reward.year} • {formatDate(reward.executedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="space-y-2">
                        {reward.winners.map((winner) => (
                          <div key={winner.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                            <div className="flex items-center space-x-3">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadgeClass(winner.rank)}`}>
                                {winner.rank}
                              </span>
                              <div>
                                <div className="font-medium">{winner.username}</div>
                                <div className="text-sm text-gray-600">{winner.points} Punkte</div>
                              </div>
                            </div>
                            <div className="text-green-600 font-semibold">
                              {winner.coinsAwarded > 0 ? `+${winner.coinsAwarded} 💰` : '0 💰'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => loadHistoryPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Vorherige
                  </button>
                  <span className="px-3 py-1">
                    Seite {currentPage} von {totalPages}
                  </span>
                  <button
                    onClick={() => loadHistoryPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Nächste
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ThemeRewardsPage;