// components/FireworkAnimation.js

import React, { useEffect, useRef } from 'react';
import Fireworks from 'fireworks-js';

const FireworkAnimation = ({ onAnimationEnd }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    }, 3000); // Duration of the animation in milliseconds

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <Fireworks
        options={{
          rocketsPoint: {
            min: 50,
            max: 50,
          },
          speed: 3,
        }}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};

export default FireworkAnimation;
