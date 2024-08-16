// lib/modals.js
import { useState, useEffect } from 'react';

export const useModal = (initialState = false) => {
  const [isModalOpen, setIsModalOpen] = useState(false); // Set to false by default

  useEffect(() => {
    // Check sessionStorage to see if the user has already acknowledged the dialog
    const hasAcknowledged = sessionStorage.getItem('acknowledged');
    if (!hasAcknowledged) {
      setIsModalOpen(true);
    }
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    // Set a flag in sessionStorage so the dialog doesn't appear again during this session
    sessionStorage.setItem('acknowledged', 'true');
  };

  return {
    isModalOpen,
    closeModal,
  };
};
