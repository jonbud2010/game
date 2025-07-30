import React from 'react';
import type { Player } from '../types/game';

interface GameOverProps {
  player: Player;
  onPlayAgain: () => void;
  onGoToMenu: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ 
  player, 
  onPlayAgain, 
  onGoToMenu 
}) => {
  return (
    <div className="game-over">
      <h1>Game Over!</h1>
      <div className="final-score">
        <h2>Final Score: {player.score}</h2>
        <p>Level Reached: {player.level}</p>
      </div>
      <div className="game-over-buttons">
        <button className="play-again-button" onClick={onPlayAgain}>
          Play Again
        </button>
        <button className="menu-button" onClick={onGoToMenu}>
          Back to Menu
        </button>
      </div>
    </div>
  );
};