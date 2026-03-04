/**
 * STARFORGE TCG - Game Board Background
 *
 * Displays board.png as the full-screen game board background
 * for every match.
 */

import React from 'react';
import boardImg from '../../assets/board.png';

export const BoardBackground: React.FC = () => {
  return (
    <div style={styles.container}>
      <img src={boardImg} alt="" style={styles.image} />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
};
