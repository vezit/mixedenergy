import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {/* Wrapper for the banner with full width and background color */}
      <div className="w-full" style={{ backgroundColor: '#212121' }}>
        <div
          className="w-full hidden lg:block"
          style={{
            height: '50vh', // This sets the height to 50% of the viewport height
            backgroundImage: "url('/images/Color-logo-with-background.png')",
            backgroundSize: 'contain', // Ensures the entire image is visible
            backgroundPosition: 'center', // Centers the image
            backgroundRepeat: 'no-repeat', // Prevents the image from repeating
          }}
        ></div>
      </div>

      <div className="flex flex-wrap justify-center p-4 max-w-screen-xl mx-auto">
        {/* First set of 4 cards */}
        <Link href="/products/mixed-any">
          <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <img
                src="/images/thunder-punch-energy.jpg"
                alt="Mixed Any"
                className="w-full h-48 object-cover"
                style={{ objectFit: 'cover', height: '200px' }}
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
                src="/images/volt-burst-energy.jpg"
                alt="Mixed Red Bulls"
                className="w-full h-48 object-cover"
                style={{ objectFit: 'cover', height: '200px' }}
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
                src="/images/iceblast-energy.jpg"
                alt="Mixed Monsters"
                className="w-full h-48 object-cover"
                style={{ objectFit: 'cover', height: '200px' }}
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
                style={{ objectFit: 'cover', height: '200px' }}
              />
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">Mixed Booster</h2>
              </div>
            </div>
          </a>
        </Link>

        {/* Insert the headline "Populære bokse" here */}
        <div className="w-full text-center py-6">
          <h1 className="text-2xl font-bold">Populære bokse</h1>
        </div>

        {/* New 3 cards */}
        <Link href="/products/Monster 8 Bland selv">
          <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <img
                src="/images/iceblast-energy.jpg"
                alt="Mix 8 Monster"
                className="w-full h-48 object-cover"
                style={{ objectFit: 'cover', height: '200px' }}
              />
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">Mix 8 Monster</h2>
              </div>
            </div>
          </a>
        </Link>

        <Link href="/products/Bland selv 8">
          <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <img
                src="/images/thunder-punch-energy.jpg"
                alt="Bland Selv Mix 8"
                className="w-full h-48 object-cover"
                style={{ objectFit: 'cover', height: '200px' }}
              />
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">Bland Selv Mix 8</h2>
              </div>
            </div>
          </a>
        </Link>

        <Link href="/products/Red Bull Bland selv 8">
          <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
              <img
                src="/images/volt-burst-energy.jpg"
                alt="Mix 8 Red Bull"
                className="w-full h-48 object-cover"
                style={{ objectFit: 'cover', height: '200px' }}
              />
              <div className="p-4 flex-grow">
                <h2 className="text-xl font-bold">Mix 8 Red Bull</h2>
              </div>
            </div>
          </a>
        </Link>
      </div>
    </div>
  );
}
