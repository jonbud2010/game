import { useGameState } from './hooks/useGameState';
import { GameMenu } from './components/GameMenu';
import { GameScreen } from './components/GameScreen';
import { GameOver } from './components/GameOver';
import { Settings } from './components/Settings';
import './App.css';

function App() {
  const {
    gameState,
    startGame,
    endGame,
    goToMenu,
    goToSettings,
    updateScore,
    resetGame,
  } = useGameState();

  const renderCurrentScreen = () => {
    switch (gameState.currentScreen) {
      case 'menu':
        return (
          <GameMenu
            onStartGame={startGame}
            onSettings={goToSettings}
          />
        );
      case 'game':
        return (
          <GameScreen
            player={gameState.player}
            onEndGame={endGame}
            onUpdateScore={updateScore}
          />
        );
      case 'gameOver':
        return (
          <GameOver
            player={gameState.player}
            onPlayAgain={() => {
              resetGame();
              startGame();
            }}
            onGoToMenu={() => {
              resetGame();
              goToMenu();
            }}
          />
        );
      case 'settings':
        return (
          <Settings onGoToMenu={goToMenu} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      {renderCurrentScreen()}
    </div>
  );
}

export default App
