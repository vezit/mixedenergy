// pages/index.js
function HomePage() {
  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-r from-blue-200 to-blue-500">
      <div className="p-8 bg-white rounded-lg shadow-lg max-w-sm">
        <h1 className="text-4xl font-bold text-blue-900 mb-4">Welcome!</h1>
        <p className="text-blue-700">
          Explore the world of Next.js and Tailwind CSS. This setup helps you build fast and stylish applications quickly.
        </p>
        <button className="mt-4 bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-300">
          Get Started
        </button>
      </div>
    </div>
  );
}

export default HomePage;
