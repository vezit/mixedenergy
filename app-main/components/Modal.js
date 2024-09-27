// components/Modal.js

import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center">
        {title && <h2 className="text-lg font-bold mb-4">{title}</h2>}
        <div className="mb-4">{children}</div>
        {/* Removed hardcoded button to make content fully dynamic */}
      </div>
    </div>
  );
};

export default Modal;
