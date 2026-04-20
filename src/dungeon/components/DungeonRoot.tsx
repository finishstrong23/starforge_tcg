import React from 'react';
import { DungeonRunProvider } from '../context/DungeonRunContext';

interface DungeonRootProps {
  onBack: () => void;
}

export const DungeonRoot: React.FC<DungeonRootProps> = ({ onBack }) => {
  return (
    <DungeonRunProvider>
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          background: '#0d0d1a',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-family, sans-serif)',
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '2rem', letterSpacing: '0.15em' }}>DUNGEON RUN</h1>
        <p style={{ opacity: 0.6, marginTop: '0.5rem' }}>Coming soon.</p>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: '1px solid #fff',
            color: '#fff',
            cursor: 'pointer',
            letterSpacing: '0.1em',
          }}
        >
          BACK TO MENU
        </button>
      </div>
    </DungeonRunProvider>
  );
};
