/**
 * STARFORGE TCG - Logo Component
 *
 * Displays logo.png as the game logo, stretched wide across the top.
 * Uses mix-blend-mode to eliminate the white/light background.
 */

import React from 'react';

const logoImg = 'https://raw.githubusercontent.com/finishstrong23/starforge_tcg/d73f605/src/assets/logo.png';

interface StarforgeLogoProps {
  width?: number | string;
  height?: number;
}

export const StarforgeLogo: React.FC<StarforgeLogoProps> = ({
  width = '100%',
  height,
}) => {
  return (
    <div style={{
      width: typeof width === 'number' ? `${width}px` : width,
      maxWidth: '100%',
    }}>
      <img
        src={logoImg}
        alt="STARFORGE TCG"
        style={{
          width: '100%',
          height: height ? `${height}px` : 'auto',
          objectFit: 'contain',
          display: 'block',
          mixBlendMode: 'screen',
          filter: 'brightness(1.1) contrast(1.05)',
        }}
      />
    </div>
  );
};
