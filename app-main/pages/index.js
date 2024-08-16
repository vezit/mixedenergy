import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(true);

  const Modal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-4 rounded-lg shadow-lg text-center">
          <h2 className="text-lg font-bold mb-4">Notice</h2>
          <p>This site is not finished, it is still being developed.</p>
          <button onClick={onClose} className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 transition duration-300 z-50">
            Dismiss
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-gray-100 shadow">
        <div className="flex items-center">
          <Image src="/images/monster_logo.png" alt="Logo" width={50} height={50} />
          <h1 className="text-3xl font-bold ml-2">Mixed Energy</h1>
        </div>
        <nav className="flex space-x-4">
          <a href="#monster" className="text-gray-700 font-semibold hover:underline">Monster Box</a>
          <a href="#booster" className="text-gray-700 font-semibold hover:underline">Booster Box</a>
          <a href="#mix" className="text-gray-700 font-semibold hover:underline">Mix Box</a>
          <a href="#redbull" className="text-gray-700 font-semibold hover:underline">Red Bull Box</a>
        </nav>
        <div className="text-lg font-semibold">Ting Ting Om Kurv</div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-8">
        <section className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">Mixed Energy Bokse</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div id="monster" className="text-center">
              <Image src="/images/monster-surge-energy.jpg" alt="Monster Box" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Monster Box</h3>
            </div>
            <div id="booster" className="text-center">
              <Image src="/images/booster-attack-energy.jpg" alt="Booster Box" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Booster Box</h3>
            </div>
            <div id="mix" className="text-center">
              <Image src="/images/blaze-fury-energy.jpg" alt="Mix Box" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Mix Box</h3>
            </div>
            <div id="redbull" className="text-center">
              <Image src="/images/redwave-energy.jpg" alt="Red Bull Box" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Red Bull Box</h3>
            </div>
          </div>
        </section>

        <section className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">Populære Bokse</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="text-center">
              <Image src="/images/chaos-splash-energy.jpg" alt="Monster 8 Bland Selv" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Monster 8 Bland Selv</h3>
            </div>
            <div className="text-center">
              <Image src="/images/thunder-punch-energy.jpg" alt="Mix 8 Bland Selv" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Mix 8 Bland Selv</h3>
            </div>
            <div className="text-center">
              <Image src="/images/winged-fury-energy.jpg" alt="Red Bull 8 Bland Selv" width={200} height={200} />
              <h3 className="text-xl font-bold mt-2">Red Bull 8 Bland Selv</h3>
            </div>
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-xl font-bold mb-4">Mest Populære Mærker eller Nye Smags Varianter?</h2>
          <div className="flex justify-center space-x-8">
            <Image src="/images/redbull_logo.png" alt="Red Bull" width={100} height={50} />
            <Image src="/images/monster_logo.png" alt="Monster Energy" width={100} height={50} />
            <Image src="/images/booster_logo_transparent.png" alt="Booster" width={100} height={50} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="p-4 bg-gray-200 text-center text-gray-600 mt-auto">
        <div className="flex justify-between text-sm">
          <div>
            <p>Information</p>
            <p>Handelsbetingelser</p>
            <p>Min Konto</p>
          </div>
          <div>
            <p>MixedEnergy</p>
            <p>Bagværds Hovedgade 141, 2800 Bagsværd</p>
            <p>CVR: 40493032</p>
            <p>info@mixedenergy.dk</p>
          </div>
          <div>
            <p>Sociale Medier</p>
            <p>(links)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}