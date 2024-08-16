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
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div
        className="w-full hidden lg:block"
        style={{
          height: '50vh', // This sets the height to 50% of the viewport height
          backgroundImage: "url('/images/startpage-background.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      ></div>

      <div className="flex flex-wrap justify-center p-4 max-w-screen-xl mx-auto">
        <Link href="/products/mixed-any">
          <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <img
                src="/images/chaos-splash-energy.jpg"
                alt="Mixed Any"
                className="w-full h-48 object-cover"
              />
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">Mixed Bland Selv</h2>
                <p className="text-gray-700">Her kan du selv blande</p>
              </div>
            </div>
          </a>
        </Link>

        <Link href="/products/mixed-red-bulls">
          <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <img
                src="/images/blazebox-energy.jpg"
                alt="Mixed Red Bulls"
                className="w-full h-48 object-cover"
              />
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">Mixed Red Bulls</h2>
              </div>
            </div>
          </a>
        </Link>

        <Link href="/products/mixed-monsters">
          <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <img
                src="/images/monster-surge-energy.jpg"
                alt="Mixed Monsters"
                className="w-full h-48 object-cover"
              />
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">Mixed Monsters</h2>
              </div>
            </div>
          </a>
        </Link>

        <Link href="/products/mixed-booster">
          <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <img
                src="/images/booster-attack-energy.jpg"
                alt="Mixed Booster"
                className="w-full h-48 object-cover"
              />
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">Mixed Booster</h2>
              </div>
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