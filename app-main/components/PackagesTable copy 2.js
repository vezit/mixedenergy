// components/PackagesTable.js

import React, { useState } from 'react';
import Modal from './Modal';

function PackagesTable({ packages, drinks, onPackageChange, onSavePackage }) {
  const [editingRows, setEditingRows] = useState({});
  const [modalType, setModalType] = useState(null);
  const [currentPackage, setCurrentPackage] = useState(null);
  const [selectedDrinks, setSelectedDrinks] = useState([]);

  // State for sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  const toggleEditing = (id) => {
    setEditingRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Get all keys from packages data
  const allKeys = packages.reduce((keys, pkg) => {
    Object.keys(pkg).forEach((key) => {
      if (!keys.includes(key)) keys.push(key);
    });
    return keys;
  }, []);

  // Sorting function
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting to packages data
  const sortedPackages = React.useMemo(() => {
    let sortablePackages = [...packages];
    if (sortConfig.key !== null) {
      sortablePackages.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        let order = 0;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          order = aValue - bValue;
        } else {
          order = aValue.toString().localeCompare(bValue.toString());
        }

        return sortConfig.direction === 'ascending' ? order : -order;
      });
    }
    return sortablePackages;
  }, [packages, sortConfig]);

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Packages</h2>
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="border px-4 py-2">Edit</th>
            {allKeys.map((key) => (
              <th
                key={key}
                className="border px-4 py-2 cursor-pointer"
                onClick={() => requestSort(key)}
              >
                {key}
                {sortConfig.key === key ? (
                  sortConfig.direction === 'ascending' ? ' 🔼' : ' 🔽'
                ) : null}
              </th>
            ))}
            <th className="border px-4 py-2">Save</th>
          </tr>
        </thead>
        <tbody>
          {sortedPackages.map((pkg) => {
            const isEditing = editingRows[pkg.id] || false;
            return (
              <tr key={pkg.id} className="border-b">
                <td className="border px-4 py-2 text-center">
                  <button
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                    onClick={() => toggleEditing(pkg.id)}
                  >
                    {isEditing ? 'Lock' : 'Edit'}
                  </button>
                </td>
                {allKeys.map((key) => {
                  const value = pkg[key];
                  const isObject = typeof value === 'object' && value !== null;
                  return (
                    <td key={key} className="border px-4 py-2">
                      {key === 'drinks' ? (
                        <button
                          className="text-blue-500 underline"
                          onClick={() => handleCellClick(pkg, key)}
                        >
                          Manage Drinks
                        </button>
                      ) : isObject ? (
                        <span>{JSON.stringify(value)}</span>
                      ) : (
                        <input
                          type={typeof value === 'number' ? 'number' : 'text'}
                          value={value}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            onPackageChange(pkg.id, [key], newValue);
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
                      onClick={() => onSavePackage(pkg)}
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

      {/* Drinks Selection Modal */}
      {modalType === 'drinksSelection' && (
        <Modal
          isOpen={true}
          onClose={() => {
            setModalType(null);
            setSelectedDrinks([]);
          }}
          title="Select Drinks"
        >
          <div className="flex">
            <div className="w-1/2">
              <h3 className="text-lg font-bold mb-2">Available Drinks</h3>
              <div className="border h-64 overflow-y-scroll">
                <ul>
                  {availableDrinks.map((drink) => (
                    <li
                      key={drink.id}
                      onDoubleClick={() => {
                        setSelectedDrinks([...selectedDrinks, drink.id]);
                      }}
                      className="p-2 hover:bg-gray-200 cursor-pointer"
                    >
                      {drink.name}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setSelectedDrinks([...selectedDrinks, ...availableDrinks.map((drink) => drink.id)])}
                className="mt-2 bg-blue-500 text-white px-2 py-1 rounded"
              >
                Choose All
              </button>
            </div>
            <div className="w-1/2">
              <h3 className="text-lg font-bold mb-2">Selected Drinks</h3>
              <div className="border h-64 overflow-y-scroll">
                <ul>
                  {selectedDrinks.map((drinkId) => {
                    const drink = drinks.find((d) => d.id === drinkId);
                    return (
                      <li
                        key={drinkId}
                        onDoubleClick={() => {
                          setSelectedDrinks(selectedDrinks.filter((id) => id !== drinkId));
                        }}
                        className="p-2 hover:bg-gray-200 cursor-pointer"
                      >
                        {drink ? drink.name : 'Unknown Drink'}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <button
                onClick={() => setSelectedDrinks([])}
                className="mt-2 bg-red-500 text-white px-2 py-1 rounded"
              >
                Remove All
              </button>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                onPackageChange(currentPackage.id, ['drinks'], selectedDrinks);
                setModalType(null);
                setSelectedDrinks([]);
              }}
              className="bg-green-500 text-white px-4 py-2 rounded mr-2"
            >
              Save
            </button>
            <button
              onClick={() => {
                setModalType(null);
                setSelectedDrinks([]);
              }}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default PackagesTable;
