import React, { useEffect, useRef } from 'react';
import { Fireworks } from 'fireworks-js';

const FireworkAnimation = ({ onAnimationEnd, buttonRef }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    let rocketsPoint = [50, 50]; // Default to center

    if (buttonRef && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const xPercent = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      const yPercent = ((rect.top + rect.height / 2) / window.innerHeight) * 100;

      rocketsPoint = [xPercent, yPercent];
    }

    const fireworks = new Fireworks(containerRef.current, {
      speed: 3,
      acceleration: 1.05,
      friction: 0.95,
      gravity: 1.5,
      particles: 50,
      trace: 3,
      explosion: 5,
      intensity: 30,
      flickering: 50,
      lineWidth: 2,
      hue: { min: 0, max: 360 }, // Changed back to object
      rocketsPoint, // Uses calculated point
      opacity: 0.5,
      brightness: { min: 50, max: 80 }, // Changed back to object
      decay: { min: 0.015, max: 0.03 }, // Changed back to object
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
        enable: false,
      },
      delay: { min: 30, max: 60 }, // Changed back to object
    });

    fireworks.start();

    const timer = setTimeout(() => {
      fireworks.stop();
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    }, 3000); // Duration of the animation

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
