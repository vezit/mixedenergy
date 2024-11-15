import React, { useEffect, useState } from 'react';
import styles from './ExplosionEffect.module.css';

const ExplosionEffect = ({ children, trigger, onComplete }) => {
  const [particles, setParticles] = useState([]);
  const [isExploding, setIsExploding] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsExploding(true);

      // Generate fire and debris particles
      const newParticles = generateParticles();
      setParticles(newParticles);

      // Remove particles and trigger onComplete after explosion
      const timeout = setTimeout(() => {
        setParticles([]);
        setIsExploding(false);
        if (onComplete) onComplete();
      }, 1000); // Explosion duration

      return () => clearTimeout(timeout);
    }
  }, [trigger, onComplete]);

  const generateParticles = () => {
    const particles = [];
    const fireCount = 25; // Fire particles
    const debrisCount = 36; // Debris particles (9x4 grid)

    // Fire particles
    for (let i = 0; i < fireCount; i++) {
      particles.push({
        type: 'fire',
        id: `fire-${i}`,
        x: randomInt(-50, 50),
        y: randomInt(-50, 50),
        scale: randomFloat(0.5, 1.5),
        duration: randomInt(500, 1000),
      });
    }

    // Debris particles
    for (let i = 0; i < debrisCount; i++) {
      particles.push({
        type: 'debris',
        id: `debris-${i}`,
        x: randomInt(-100, 100),
        y: randomInt(-100, 100),
        rotation: randomInt(0, 360),
        duration: randomInt(800, 1200),
      });
    }

    return particles;
  };

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randomFloat = (min, max) => Math.random() * (max - min) + min;

  return (
    <div className={styles.explosionContainer}>
      {children}
      {isExploding &&
        particles.map((particle) => (
          <div
            key={particle.id}
            className={`${styles.particle} ${
              particle.type === 'fire' ? styles.fire : styles.debris
            }`}
            style={{
              transform: `translate(${particle.x}px, ${particle.y}px) scale(${particle.scale || 1}) rotate(${particle.rotation || 0}deg)`,
              animationDuration: `${particle.duration}ms`,
            }}
          />
        ))}
    </div>
  );
};

export default ExplosionEffect;
