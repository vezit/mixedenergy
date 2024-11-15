// components/ExplosionEffect.js

import React, { useEffect, useState } from 'react';
import styles from './ExplosionEffect.module.css';

const ExplosionEffect = ({ children, trigger, onComplete }) => {
  const [isExploding, setIsExploding] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsExploding(true);
      // Set a timeout to call onComplete after the animation duration
      const timeout = setTimeout(() => {
        setIsExploding(false);
        if (onComplete) {
          onComplete();
        }
      }, 1000); // Duration of the explosion animation in milliseconds

      return () => clearTimeout(timeout);
    }
  }, [trigger, onComplete]);

  return (
    <div className={`${styles.explosionContainer} ${isExploding ? styles.explode : ''}`}>
      {children}
      {isExploding && <div className={styles.explosionAnimation} />}
    </div>
  );
};

export default ExplosionEffect;
