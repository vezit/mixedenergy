// components/PackagesTable.js

import React, { useState } from 'react';
import Modal from './Modal';

function PackagesTable({
  packages,
  drinks,
  onPackageChange,
  onSavePackage,
  onDeletePackage,
  onAddPackage,
}) {
  const [editingRows, setEditingRows] = useState({});
  const [modalType, setModalType] = useState(null);
  const [currentPackage, setCurrentPackage] = useState(null);
  const [selectedDrinks, setSelectedDrinks] = useState([]);
  const [newPackage, setNewPackage] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);

  // State for sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  const toggleEditing = (docId) => {
    setEditingRows((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  // Get all keys from packages data
  const allKeys = packages.reduce((keys, pkg) => {
    Object.keys(pkg).forEach((key) => {
      if (!keys.includes(key)) keys.push(key);
    });
    return keys;
  }, []);

  // Define the desired column order
  const columnOrder = ['docId', 'title', 'slug', 'description', 'category', 'image', 'drinks', 'packages'];

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

  const handleCellClick = (pkg, key) => {
    if (key === 'drinks') {
      setCurrentPackage(pkg);
      setSelectedDrinks(pkg.drinks || []);
      setModalType('drinksSelection');
    } else if (key === 'packages') {
      // Handle editing nested packages array
      setCurrentPackage(pkg);
      setModalType('packagesEditing');
    }
  };

  // Add Package Modal and Save logic...
  const handleAddPackage = () => {
    setNewPackage({
      title: '',
      slug: '',
      description: '',
      category: '',
      image: '',
      drinks: [],
      packages: [],
    });
    setShowAddModal(true);
  };

  const handleSaveNewPackage = () => {
    onAddPackage(newPackage);
    setShowAddModal(false);
    setNewPackage({});
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Packages</h2>
      <button
        className="mb-4 bg-green-500 text-white px-4 py-2 rounded"
        onClick={handleAddPackage}
      >
        Add New Package
      </button>
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="border px-4 py-2">Edit</th>
            {columnOrder.map((key) => (
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
            <th className="border px-4 py-2">Delete</th>
          </tr>
        </thead>
        <tbody>
          {sortedPackages.map((pkg) => {
            const isEditing = editingRows[pkg.docId] || false;
            return (
              <tr key={pkg.docId} className="border-b">
                <td className="border px-4 py-2 text-center">
                  <button
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                    onClick={() => toggleEditing(pkg.docId)}
                  >
                    {isEditing ? 'Lock' : 'Edit'}
                  </button>
                </td>
                {columnOrder.map((key) => {
                  const value = pkg[key];
                  const isObject = typeof value === 'object' && value !== null;
                  return (
                    <td key={key} className="border px-4 py-2">
                      {key === 'drinks' || key === 'packages' ? (
                        <button
                          className="text-blue-500 underline"
                          onClick={() => handleCellClick(pkg, key)}
                        >
                          {key === 'drinks' ? 'Manage Drinks' : 'Edit Packages'}
                        </button>
                      ) : isObject ? (
                        <span>{JSON.stringify(value)}</span>
                      ) : (
                        <input
                          type={typeof value === 'number' ? 'number' : 'text'}
                          value={value || ''}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            onPackageChange(pkg.docId, [key], newValue);
                          }}
                          disabled={!isEditing || key === 'docId'}
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
                <td className="border px-4 py-2 text-center">
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded"
                    onClick={() => onDeletePackage(pkg.docId)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Add New Package Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Package"
        >
          <div className="space-y-4">
            {Object.keys(newPackage).map((key) => {
              const value = newPackage[key];
              const isObject = typeof value === 'object' && value !== null;

              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700">{key}</label>
                  {key === 'drinks' || key === 'packages' ? (
                    <button
                      className="text-blue-500 underline"
                      onClick={() => {
                        setCurrentPackage(newPackage);
                        if (key === 'drinks') {
                          setSelectedDrinks(newPackage.drinks || []);
                          setModalType('drinksSelection');
                        }
                      }}
                    >
                      {key === 'drinks' ? 'Manage Drinks' : 'Edit Packages'}
                    </button>
                  ) : isObject ? (
                    <textarea
                      value={JSON.stringify(value, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsedValue = JSON.parse(e.target.value);
                          setNewPackage({
                            ...newPackage,
                            [key]: parsedValue,
                          });
                        } catch (error) {
                          console.error('Invalid JSON');
                        }
                      }}
                      className="border p-1 w-full"
                      rows={4}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewPackage({
                          ...newPackage,
                          [key]: val,
                        });
                      }}
                      className="border p-1 w-full"
                    />
                  )}
                </div>
              );
            })}
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSaveNewPackage}
                className="bg-green-500 text-white px-4 py-2 rounded mr-2"
              >
                Save
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

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
                  {drinks
                    .filter((drink) => !selectedDrinks.includes(drink.docId))
                    .map((drink) => (
                      <li
                        key={drink.docId}
                        onDoubleClick={() => {
                          setSelectedDrinks([...selectedDrinks, drink.docId]);
                        }}
                        className="p-2 hover:bg-gray-200 cursor-pointer"
                      >
                        {drink.name}
                      </li>
                    ))}
                </ul>
              </div>
              <button
                onClick={() =>
                  setSelectedDrinks(drinks.map((drink) => drink.docId))
                }
                className="mt-2 bg-blue-500 text-white px-2 py-1 rounded"
              >
                Choose All
              </button>
            </div>
            <div className="w-1/2">
              <h3 className="text-lg font-bold mb-2">Selected Drinks</h3>
              <div className="border h-64 overflow-y-scroll">
                <ul>
                  {selectedDrinks.map((drinkDocId) => {
                    const drink = drinks.find((d) => d.docId === drinkDocId);
                    return (
                      <li
                        key={drinkDocId}
                        onDoubleClick={() => {
                          setSelectedDrinks(
                            selectedDrinks.filter((id) => id !== drinkDocId)
                          );
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
                onPackageChange(currentPackage.docId, ['drinks'], selectedDrinks);
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
