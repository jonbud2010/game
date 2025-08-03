import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { LocalGameState, Player } from '../types/game';

const initialPlayer: Player = {
  id: uuidv4(),
  name: 'Player',
  score: 0,
  level: 1,
};

const initialGameState: LocalGameState = {
  player: initialPlayer,
  isGameActive: false,
  currentScreen: 'menu',
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<LocalGameState>(initialGameState);

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      isGameActive: true,
      currentScreen: 'match',
    }));
  };

  const endGame = () => {
    setGameState(prev => ({
      ...prev,
      isGameActive: false,
      currentScreen: 'league',
    }));
  };

  const goToMenu = () => {
    setGameState(prev => ({
      ...prev,
      currentScreen: 'menu',
    }));
  };

  const goToLobby = () => {
    setGameState(prev => ({
      ...prev,
      currentScreen: 'lobby',
    }));
  };

  const updateScore = (points: number) => {
    setGameState(prev => ({
      ...prev,
      player: prev.player ? {
        ...prev.player,
        score: prev.player.score + points,
      } : null,
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
    goToLobby,
    updateScore,
    resetGame,
  };
};