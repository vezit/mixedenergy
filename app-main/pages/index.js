import { useEffect, useState } from 'react';
import axios from 'axios';

function HomePage() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    axios.get('/api/hello')
      .then(response => {
        setMessage(response.data.message);
      })
      .catch(error => {
        console.error('Error fetching the message:', error);
        setMessage('Failed to load message.');
      });
  }, []);

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
        <div className="mt-4">
          <h2 className="text-2xl font-bold text-blue-900 mb-2">Message from API:</h2>
          <p className="text-blue-700">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;