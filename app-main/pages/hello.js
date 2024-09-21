import { useEffect, useState } from 'react';

export default function Hello() {
  const [data, setData] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/firebase/getData')
      .then((response) => response.json())
      .then((data) => {
        console.log("Fetched data:", data);
        setData(Array.isArray(data) ? data : []);
      })
      .catch((error) => console.error('Error fetching data:', error));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/firebase/writeData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: inputValue }),
      });
      const result = await response.json();
      console.log('Write result:', result);
      setInputValue(''); // Clear the input field

      // Fetch updated data after writing
      fetch('/api/firebase/getData')
        .then((response) => response.json())
        .then((data) => {
          setData(Array.isArray(data) ? data : []);
          setLoading(false);
        });
    } catch (error) {
      console.error('Error writing data:', error);
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Hello World Data</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter data"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Writing...' : 'Submit'}
        </button>
      </form>

      <ul>
        {data.length > 0 ? (
          data.map((item) => (
            <li key={item.id}>{item.test}</li>
          ))
        ) : (
          <li>No data found</li>
        )}
      </ul>
    </div>
  );
}
