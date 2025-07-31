import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  overlay?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  text = 'Wird geladen...',
  overlay = false 
}) => {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large'
  };

  const spinner = (
    <div 
      className={`loading-spinner ${sizeClasses[size]}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div 
        className="spinner-circle"
        aria-hidden="true"
      ></div>
      {text && (
        <p className="spinner-text" aria-describedby="loading-description">
          {text}
        </p>
      )}
      <span className="sr-only" id="loading-description">
        Inhalt wird geladen, bitte warten...
      </span>
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-overlay">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;