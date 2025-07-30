import React from 'react';
import type { Player } from '../types/game';

interface GameScreenProps {
  player: Player;
  onEndGame: () => void;
  onUpdateScore: (points: number) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ 
  player, 
  onEndGame, 
  onUpdateScore 
}) => {
  const handleScoreClick = () => {
    onUpdateScore(10);
  };

  return (
    <div className="game-screen">
      <div className="game-header">
        <div className="player-info">
          <span>Player: {player.name}</span>
          <span>Score: {player.score}</span>
          <span>Level: {player.level}</span>
        </div>
        <button className="end-game-button" onClick={onEndGame}>
          End Game
        </button>
      </div>
      
      <div className="game-content">
        <h2>Game Area</h2>
        <p>Click the button below to score points!</p>
        <button className="score-button" onClick={handleScoreClick}>
          Score Points (+10)
        </button>
      </div>
    </div>
  );
};