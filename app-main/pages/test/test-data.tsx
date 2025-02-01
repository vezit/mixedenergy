import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface MyTableRow {
  id: number;
  // other fields from your DB table
}

export default function TestDataPage() {
  const [rows, setRows] = useState<MyTableRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRows() {
      try {
        const response = await axios.get<{ data: MyTableRow[] }>('/api/supabase/testData');
        setRows(response.data.data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error fetching data');
      }
    }
    fetchRows();
  }, []);

  if (error) return <p>Error: {error}</p>;
  if (!rows) return <p>Loading data...</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Data Page</h1>
      {rows.length === 0 && <p>No rows found in <code>my_table</code></p>}
      {rows.map((row) => (
        <div key={row.id}>
          <pre>{JSON.stringify(row, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
