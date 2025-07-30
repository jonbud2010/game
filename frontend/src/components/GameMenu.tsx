import React from 'react';
import type { MenuItem } from '../types/game';

interface GameMenuProps {
  onStartGame: () => void;
  onSettings: () => void;
}

export const GameMenu: React.FC<GameMenuProps> = ({ onStartGame, onSettings }) => {
  const menuItems: MenuItem[] = [
    {
      id: 'start',
      label: 'Start Game',
      action: onStartGame,
    },
    {
      id: 'settings',
      label: 'Settings',
      action: onSettings,
    },
  ];

  return (
    <div className="game-menu">
      <h1>Browser Game</h1>
      <div className="menu-items">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className="menu-button"
            onClick={item.action}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};