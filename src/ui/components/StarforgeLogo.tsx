/**
 * STARFORGE TCG - Logo Component
 *
 * Displays logo.png as the game logo used on menus
 * and title screens.
 */

import React from 'react';

const logoImg = 'https://raw.githubusercontent.com/finishstrong23/starforge_tcg/b1639e2/src/assets/logo.png';

interface StarforgeLogoProps {
  width?: number;
  height?: number;
}

export const StarforgeLogo: React.FC<StarforgeLogoProps> = ({
  width = 320,
  height,
}) => {
  return (
    <div style={{ width, maxWidth: '100%' }}>
      <img
        src={logoImg}
        alt="STARFORGE TCG"
        style={{
          width: '100%',
          height: height ? `${height}px` : 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
};
