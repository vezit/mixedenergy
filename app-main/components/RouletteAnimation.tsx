import React, { useEffect } from 'react';
import styles from './RouletteAnimation.module.css';

interface RouletteAnimationProps {
  images: string[];
  duration?: number;
  onComplete?: () => void;
}

const RouletteAnimation: React.FC<RouletteAnimationProps> = ({ images, duration = 4000, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  const repeated = [...images, ...images, ...images];

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.track} style={{ animationDuration: `${duration}ms` }}>
          {repeated.map((src, idx) => (
            <img key={idx} src={src} alt="drink" className={styles.image} />
          ))}
        </div>
        <div className={styles.highlight}></div>
      </div>
      <div className={styles.text}>Åbner pakke...</div>
    </div>
  );
};

export default RouletteAnimation;
