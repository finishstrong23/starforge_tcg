/**
 * STARFORGE TCG - Screen Transition Wrapper
 *
 * Wraps screen content with a fade-in animation on mount.
 * Provides smooth visual transition between game screens.
 */

import React, { useState, useEffect } from 'react';

interface ScreenTransitionProps {
  children: React.ReactNode;
  /** Unique key for the current screen to trigger transition */
  screenKey: string;
}

export const ScreenTransition: React.FC<ScreenTransitionProps> = ({ children, screenKey }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(timer);
  }, [screenKey]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
    }}>
      {children}
    </div>
  );
};
