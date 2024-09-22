// pages/index.js
import Link from 'next/link';
import products from '../lib/products'; // Adjust the path if necessary

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {/* Wrapper for the banner with full width and background color */}
      <div className="w-full" style={{ backgroundColor: '#212121' }}>
        <div
          className="w-full hidden lg:block"
          style={{
            height: '50vh', // Sets the height to 50% of the viewport height
            backgroundImage: "url('/images/Color-logo-with-background.png')",
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        ></div>
      </div>

      {/* Headline above the cards */}
      <div className="w-full text-center py-6">
        <h1 className="text-3xl font-bold">Bland selv mix</h1>
      </div>

      <div className="flex flex-wrap justify-center p-4 max-w-screen-xl mx-auto">
        {/* First set of 4 cards - Bland Selv Mix */}
        {['mixed-any-mix', 'mixed-red-bull-mix', 'mixed-monster-mix', 'mixed-booster-mix'].map((slug) => {
          const product = products[slug];
          return (
            <Link href={`/products/bland-selv-mix/${slug}`} key={slug}>
              <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
                <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
                  <div className="w-full h-60">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex-grow">
                    <h2 className="text-xl font-bold">{product.title}</h2>
                    <p className="text-gray-700">{product.description}</p>
                  </div>
                </div>
              </a>
            </Link>
          );
        })}

        {/* Insert the headline "Vi Blander For Dig" here */}
        <div className="w-full text-center py-6">
          <h1 className="text-2xl font-bold">Vi Blander For Dig</h1>
        </div>

        {/* Second set of 4 cards - Vi Blander For Dig */}
        {['mixed-any', 'mixed-red-bulls', 'mixed-monsters', 'mixed-boosters'].map((slug) => {
          const product = products[slug];
          return (
            <Link href={`/products/vi-blander-for-dig/${slug}`} key={slug}>
              <a className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
                <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
                  <div className="w-full h-60">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex-grow">
                    <h2 className="text-xl font-bold">{product.title}</h2>
                    <p className="text-gray-700">{product.description}</p>
                  </div>
                </div>
              </a>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
