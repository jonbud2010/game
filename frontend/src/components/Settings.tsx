import React from 'react';

interface SettingsProps {
  onGoToMenu: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onGoToMenu }) => {
  return (
    <div className="settings">
      <h1>Settings</h1>
      <div className="settings-content">
        <p>Game settings will be implemented here.</p>
      </div>
      <button className="back-button" onClick={onGoToMenu}>
        Back to Menu
      </button>
    </div>
  );
};