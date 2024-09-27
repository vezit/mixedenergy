// components/DrinksTable.js

import React, { useState } from 'react';
import Modal from './Modal';

function DrinksTable({ drinks, onDrinkChange, onSaveDrink }) {
  const [editingRows, setEditingRows] = useState({});
  const [modalStack, setModalStack] = useState([]);
  const [currentData, setCurrentData] = useState(null);

  const toggleEditing = (id) => {
    setEditingRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Get all keys from drinks data
  const allKeys = drinks.reduce((keys, drink) => {
    Object.keys(drink).forEach((key) => {
      if (!keys.includes(key)) keys.push(key);
    });
    return keys;
  }, []);

  const handleCellClick = (drink, key) => {
    const value = drink[key];
    if (typeof value === 'object' && value !== null) {
      // Open modal
      setModalStack([{ data: value, path: [drink.id, key] }]);
      setCurrentData(value);
    }
  };

  const handleModalCellClick = (value, path) => {
    if (typeof value === 'object' && value !== null) {
      // Drill down further
      setModalStack([...modalStack, { data: value, path }]);
      setCurrentData(value);
    }
  };

  const handleBack = () => {
    const newStack = [...modalStack];
    newStack.pop();
    setModalStack(newStack);
    if (newStack.length > 0) {
      setCurrentData(newStack[newStack.length - 1].data);
    } else {
      setCurrentData(null);
    }
  };

  const handleModalChange = (path, key, newValue) => {
    const drinkId = path[0];
    const fieldPath = [...path.slice(1), key];
    onDrinkChange(drinkId, fieldPath, newValue);
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Drinks</h2>
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="border px-4 py-2">Edit</th>
            {allKeys.map((key) => (
              <th key={key} className="border px-4 py-2">{key}</th>
            ))}
            <th className="border px-4 py-2">Save</th>
          </tr>
        </thead>
        <tbody>
          {drinks.map((drink, index) => {
            const isEditing = editingRows[drink.id] || false;
            return (
              <tr key={drink.id} className="border-b">
                <td className="border px-4 py-2 text-center">
                  <button
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                    onClick={() => toggleEditing(drink.id)}
                  >
                    {isEditing ? 'Lock' : 'Edit'}
                  </button>
                </td>
                {allKeys.map((key) => {
                  const value = drink[key];
                  const isObject = typeof value === 'object' && value !== null;
                  return (
                    <td key={key} className="border px-4 py-2">
                      {isObject ? (
                        <button
                          className="text-blue-500 underline"
                          onClick={() => handleCellClick(drink, key)}
                        >
                          {key}
                        </button>
                      ) : (
                        <input
                          type={typeof value === 'number' ? 'number' : 'text'}
                          value={value}
                          onChange={(e) => {
                            const newValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                            onDrinkChange(drink.id, [key], newValue);
                          }}
                          disabled={!isEditing}
                          className="border p-1 w-full"
                        />
                      )}
                    </td>
                  );
                })}
                <td className="border px-4 py-2 text-center">
                  {isEditing && (
                    <button
                      className="bg-green-500 text-white px-2 py-1 rounded"
                      onClick={() => onSaveDrink(drink)}
                    >
                      Save
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Modal for nested data */}
      {currentData && (
        <Modal isOpen={true} onClose={() => setCurrentData(null)} title="Edit Data">
          <div>
            {modalStack.length > 1 && (
              <button onClick={handleBack} className="mb-2 bg-gray-200 px-2 py-1 rounded">
                Back
              </button>
            )}
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border px-4 py-2">Field</th>
                  <th className="border px-4 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(currentData).map(([key, value]) => {
                  const isObject = typeof value === 'object' && value !== null;
                  const path = [...modalStack[modalStack.length - 1].path, key];
                  return (
                    <tr key={key}>
                      <td className="border px-4 py-2">{key}</td>
                      <td className="border px-4 py-2">
                        {isObject ? (
                          <button
                            className="text-blue-500 underline"
                            onClick={() => handleModalCellClick(value, path)}
                          >
                            {key}
                          </button>
                        ) : (
                          <input
                            type={typeof value === 'number' ? 'number' : 'text'}
                            value={value}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              // Update the currentData
                              const updatedData = { ...currentData, [key]: newValue };
                              setCurrentData(updatedData);
                              handleModalChange(modalStack[modalStack.length - 1].path, key, newValue);
                            }}
                            className="border p-1 w-full"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button
              onClick={() => setCurrentData(null)}
              className="mt-4 bg-blue-500 text-white py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default DrinksTable;
