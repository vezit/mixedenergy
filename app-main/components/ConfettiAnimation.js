// components/ConfettiAnimation.js
import { useEffect } from 'react';
import confetti from 'canvas-confetti';

const ConfettiAnimation = ({ onAnimationEnd }) => {
  useEffect(() => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // End the animation after a set duration
    const timer = setTimeout(() => {
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    }, 3000); // 3 seconds duration

    return () => clearTimeout(timer); // Cleanup
  }, [onAnimationEnd]);

  return null; // No visual element needed
};

export default ConfettiAnimation;
