import { useState } from 'react';

function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(true);

  const Modal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
        <div className="bg-white p-4 rounded-lg shadow-lg text-center">
          <h2 className="text-lg font-bold mb-4">Notice</h2>
          <p>This site is not finished, it is still being developed.</p>
          <button onClick={onClose} className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 transition duration-300">
            Dismiss
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-r from-blue-200 to-blue-500">
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <div className="p-8 bg-white rounded-lg shadow-lg max-w-sm w-full">
        <h1 className="text-4xl font-bold text-blue-900 mb-4">Welcome!</h1>
        <button className="mt-4 bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-300">
          Get Started
        </button>
      </div>
    </div>
  );
}

export default HomePage;
