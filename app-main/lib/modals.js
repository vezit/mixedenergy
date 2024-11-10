// lib/modals.js
import { useState, useEffect } from 'react';

export const useModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let hasAcknowledged = false;
    try {
      hasAcknowledged = sessionStorage.getItem('acknowledged');
    } catch (e) {
      console.error('Error accessing sessionStorage:', e);
      hasAcknowledged = false;
    }
    if (!hasAcknowledged) {
      setIsModalOpen(true);
    }
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    try {
      sessionStorage.setItem('acknowledged', 'true');
    } catch (e) {
      console.error('Error accessing sessionStorage:', e);
    }
  };

  return {
    isModalOpen,
    closeModal,
  };
};
