import { useEffect } from 'react';
import confetti from 'canvas-confetti';

const ConfettiAnimation = ({ onAnimationEnd, buttonRef }) => {
  useEffect(() => {
    if (buttonRef && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();

      // Calculate the position to set the origin
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x, y },
      });
    } else {
      // Fallback to center if buttonRef is not available
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.5 },
      });
    }

    // End the animation after a set duration
    const timer = setTimeout(() => {
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    }, 3000); // 3 seconds duration

    return () => clearTimeout(timer); // Cleanup
  }, [onAnimationEnd, buttonRef]);

  return null; // No visual element needed
};

export default ConfettiAnimation;
