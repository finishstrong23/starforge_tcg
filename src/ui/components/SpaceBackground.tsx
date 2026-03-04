/**
 * STARFORGE TCG - Space Background
 *
 * Displays background.png as the full-screen background
 * used across all menu and UI screens.
 */

import React from 'react';

const backgroundImg = 'https://raw.githubusercontent.com/finishstrong23/starforge_tcg/claude/add-last-words-keyword-3xGpp/src/assets/background.png';

export const SpaceBackground: React.FC = () => {
  return (
    <div style={styles.container}>
      <img src={backgroundImg} alt="" style={styles.image} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
};
