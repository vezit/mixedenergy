import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // Import your Modal component

const DomainModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the current domain is 'www.mixedenergy.dk'
    if (window.location.hostname === 'www.mixedenergy.dk') {
      setIsOpen(true); // Show modal
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false); // Close modal on button click
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Site Under Development">
      <p>This site is still under development and is expected to launch this year!</p>
      <button 
        onClick={handleClose} 
        className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 transition duration-300"
      >
        I Understand, I want to explore
      </button>
    </Modal>
  );
};

export default DomainModal;
