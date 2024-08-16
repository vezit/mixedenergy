export default function Home() {
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
        <div className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
            <img
              src="/images/chaos-splash-energy.jpg"
              alt="Mixed Box"
              className="w-full h-48 object-cover"
            />
            <div className="p-4 flex-grow">
              <h2 className="text-xl font-bold">Mixed Box</h2>
              <p className="text-gray-700">Bland Selv</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
            <img
              src="/images/blazebox-energy.jpg"
              alt="Red Bull Box"
              className="w-full h-48 object-cover"
            />
            <div className="p-4 flex-grow">
              <h2 className="text-xl font-bold">Red Bull Box</h2>
            </div>
          </div>
        </div>

        <div className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
            <img
              src="/images/monster-surge-energy.jpg"
              alt="Monster Box"
              className="w-full h-48 object-cover"
            />
            <div className="p-4 flex-grow">
              <h2 className="text-xl font-bold">Monster Box</h2>
            </div>
          </div>
        </div>

        <div className="flex flex-col w-full md:w-1/2 lg:w-1/4 p-2">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
            <img
              src="/images/booster-attack-energy.jpg"
              alt="Booster Box"
              className="w-full h-48 object-cover"
            />
            <div className="p-4 flex-grow">
              <h2 className="text-xl font-bold">Booster Box</h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
