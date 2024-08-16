// components/Modal.js

import React from 'react';

const Modal = ({ isOpen, onClose, title = "Notice", children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg text-center">
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        <div className="mb-4">{children}</div>
        <button onClick={onClose} className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 transition duration-300 z-50">
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default Modal;
