import React, { useEffect, useRef } from 'react';
import { Fireworks } from 'fireworks-js';

interface FireworkAnimationProps {
  onAnimationEnd?: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

const FireworkAnimation: React.FC<FireworkAnimationProps> = ({
  onAnimationEnd,
  buttonRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Default horizontal rocket position is { min: 50, max: 50 } (center).
    let rocketsPoint = { min: 50, max: 50 };

    // If we have a buttonRef, compute a horizontal % to place rockets near the button.
    if (buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const xPercent = ((rect.left + rect.width / 2) / window.innerWidth) * 100;

      // For a single fixed position, set both min & max to xPercent
      rocketsPoint = { min: xPercent, max: xPercent };
    }

    // Initialize fireworks
    const fireworks = new Fireworks(containerRef.current!, {
      // speed: 3,
      acceleration: 1.05,
      friction: 0.95,
      gravity: 1.5,
      particles: 50,
      // trace: 3,
      explosion: 5,

      flickering: 50,
      intensity: 30,
      hue: { min: 0, max: 360 },
      rocketsPoint, // now an object, not a single number
      opacity: 0.5,
      brightness: { min: 50, max: 80 },
      decay: { min: 0.015, max: 0.03 },

      mouse: {
        click: false,
        move: false,
        max: 1,
      },
      boundaries: {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      },
      sound: {
        // property changed from "enable" -> "enabled"
        enabled: false,
      },
      delay: { min: 30, max: 60 },
    });

    // Start fireworks animation
    fireworks.start();

    // Stop fireworks after 3 seconds
    const timer = setTimeout(() => {
      fireworks.stop();
      onAnimationEnd?.();
    }, 3000);

    return () => {
      fireworks.stop();
      clearTimeout(timer);
    };
  }, [onAnimationEnd, buttonRef]);

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
    />
  );
};

export default FireworkAnimation;
