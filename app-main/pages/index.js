import { useState } from 'react';
import Image from 'next/image';
import Modal from '../components/Modal';
import Header from '../components/Header';  // Import the Header component
import Footer from '../components/Footer';  // Import the Footer component
import { useModal } from '../lib/modals';

export default function Home() {
  const { isModalOpen, closeModal } = useModal(true);


  return (
    <div className="flex flex-col min-h-screen">
      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <p>This is the Handelsbetingelser page. The site is still under development.</p>
      </Modal>


      {/* Header */}
      <Header />  {/* Use the Header component here */}

      {/* Main Content */}
      <main className="flex-grow p-8">
 
      </main>

      {/* Footer */}
      <Footer /> 
    </div>
  );
}