import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { GameState, Player } from '../types/game';

const initialPlayer: Player = {
  id: uuidv4(),
  name: 'Player',
  score: 0,
  level: 1,
};

const initialGameState: GameState = {
  player: initialPlayer,
  isGameActive: false,
  currentScreen: 'menu',
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      isGameActive: true,
      currentScreen: 'game',
    }));
  };

  const endGame = () => {
    setGameState(prev => ({
      ...prev,
      isGameActive: false,
      currentScreen: 'gameOver',
    }));
  };

  const goToMenu = () => {
    setGameState(prev => ({
      ...prev,
      currentScreen: 'menu',
    }));
  };

  const goToSettings = () => {
    setGameState(prev => ({
      ...prev,
      currentScreen: 'settings',
    }));
  };

  const updateScore = (points: number) => {
    setGameState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        score: prev.player.score + points,
      },
    }));
  };

  const resetGame = () => {
    setGameState({
      ...initialGameState,
      player: {
        ...initialPlayer,
        id: uuidv4(),
      },
    });
  };

  return {
    gameState,
    startGame,
    endGame,
    goToMenu,
    goToSettings,
    updateScore,
    resetGame,
  };
};