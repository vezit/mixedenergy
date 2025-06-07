import React, { useEffect } from 'react';
import styles from './RouletteAnimation.module.css';

interface RouletteAnimationProps {
  images: string[];
  duration?: number;
  onComplete?: () => void;
}

const RouletteAnimation: React.FC<RouletteAnimationProps> = ({ images, duration = 8000, onComplete }) => {
  useEffect(() => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    function playTick() {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1000;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    }

    const interval = setInterval(playTick, 120);
    const timer = setTimeout(() => {
      clearInterval(interval);
      if (audioCtx.state !== 'closed') {
        audioCtx.close();
      }
      onComplete?.();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
      if (audioCtx.state !== 'closed') {
        audioCtx.close();
      }
    };
  }, [duration, onComplete]);

  const repeated = Array(8)
    .fill(null)
    .flatMap(() => images);


  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div
          className={styles.track}
          style={{ animationDuration: `${duration}ms`, ['--duration' as any]: `${duration}ms` }}
        >
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
