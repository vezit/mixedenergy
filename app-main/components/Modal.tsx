// components/Modal.tsx
import React, { FC, ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
}

const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center max-h-[80vh] overflow-y-auto w-full max-w-md mx-4">
        {title && <h2 className="text-lg font-bold mb-4">{title}</h2>}
        <div className="mb-4">{children}</div>
        {/* Removed hardcoded close button to allow custom buttons from parent */}
      </div>
    </div>
  );
};

export default Modal;
