// components/DrinksTable.js

import React, { useState } from 'react';
import Modal from './Modal';

function DrinksTable({
  drinks,
  onDrinkChange,
  onSaveDrink,
  onDeleteDrink,
  onAddDrink,
}) {
  const [editingRows, setEditingRows] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDrink, setNewDrink] = useState({});
  const [modalStack, setModalStack] = useState([]);
  const [currentData, setCurrentData] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);

  // State for sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  const toggleEditing = (docId) => {
    setEditingRows((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  // Define the desired column order
  const columnOrder = [
    'id',
    'docId',
    'name',
    'packageQuantity',
    'purchasePrice',
    'stock',
    'salePrice',
    'nutrition',
    'isSugarFree',
    'size',
    'image',
  ];

  const handleCellClick = (drink, key) => {
    const value = drink[key];
    if (typeof value === 'object' && value !== null) {
      // Open modal
      setModalStack([{ data: value, path: [drink.docId, key], title: key }]);
      setCurrentData(value);
      setCurrentPath([drink.docId, key]);
    }
  };

  // Sorting function
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting to drinks data
  const sortedDrinks = React.useMemo(() => {
    let sortableDrinks = [...drinks];
    if (sortConfig.key !== null) {
      sortableDrinks.sort((a, b) => {
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
    return sortableDrinks;
  }, [drinks, sortConfig]);

  // Add Drink Modal and Save logic...
  const handleAddDrink = () => {
    setNewDrink({
      image: '/images/path/to/image.png',
      stock: 100,
      name: 'Format Is Like This',
      size: '0.5 l',
      isSugarFree: false,
      salePrice: 2500,
      purchasePrice: 1250,
      packageQuantity: 24,
      nutrition: {
        per100ml: {
          energy: '',
          fat: '',
          saturatedFat: '',
          carbohydrates: '',
          sugar: '',
          protein: '',
          salt: '',
        },
      },
    });
    setShowAddModal(true);
  };

  const handleSaveNewDrink = () => {
    onAddDrink(newDrink);
    setShowAddModal(false);
    setNewDrink({});
  };

  // Handle nested data editing (e.g., nutrition)
  const handleNestedDataChange = (path, value) => {
    const [docId, ...restPath] = path;
    onDrinkChange(docId, restPath, value);
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Drinks</h2>
      <button
        className="mb-4 bg-green-500 text-white px-4 py-2 rounded"
        onClick={handleAddDrink}
      >
        Add New Drink
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
          {sortedDrinks.map((drink) => {
            const isEditing = editingRows[drink.docId] || false;
            return (
              <tr key={drink.docId} className="border-b">
                <td className="border px-4 py-2 text-center">
                  <button
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                    onClick={() => toggleEditing(drink.docId)}
                  >
                    {isEditing ? 'Lock' : 'Edit'}
                  </button>
                </td>
                {columnOrder.map((key) => {
                  const value = drink[key];
                  const isObject = typeof value === 'object' && value !== null;

                  return (
                    <td key={key} className="border px-4 py-2">
                      {isObject ? (
                        <button
                          className="text-blue-500 underline"
                          onClick={() => handleCellClick(drink, key)}
                        >
                          Edit {key}
                        </button>
                      ) : (
                        <input
                          type={
                            typeof value === 'number'
                              ? 'number'
                              : key === 'isSugarFree'
                              ? 'checkbox'
                              : 'text'
                          }
                          value={key === 'isSugarFree' ? undefined : value || ''}
                          checked={key === 'isSugarFree' ? value || false : undefined}
                          onChange={(e) => {
                            const newValue =
                              e.target.type === 'checkbox'
                                ? e.target.checked
                                : e.target.value;
                            if (key !== 'id' && key !== 'docId') {
                              onDrinkChange(drink.docId, [key], newValue);
                            }
                          }}
                          disabled={!isEditing || key === 'id' || key === 'docId'}
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
                <td className="border px-4 py-2 text-center">
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded"
                    onClick={() => onDeleteDrink(drink.docId)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Add New Drink Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Drink"
        >
          <div className="space-y-4">
            {Object.keys(newDrink).map((key) => {
              if (key === 'id' || key === 'docId') return null;
              const value = newDrink[key];
              const isObject = typeof value === 'object' && value !== null;

              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700">{key}</label>
                  {isObject ? (
                    <button
                      className="text-blue-500 underline"
                      onClick={() => {
                        setModalStack([{ data: value, path: [key], title: key }]);
                        setCurrentData(value);
                        setCurrentPath([key]);
                      }}
                    >
                      Edit {key}
                    </button>
                  ) : (
                    <input
                      type={
                        typeof value === 'number'
                          ? 'number'
                          : key === 'isSugarFree'
                          ? 'checkbox'
                          : 'text'
                      }
                      value={key === 'isSugarFree' ? undefined : value || ''}
                      checked={key === 'isSugarFree' ? value || false : undefined}
                      onChange={(e) => {
                        const val =
                          e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                        setNewDrink({
                          ...newDrink,
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
                onClick={handleSaveNewDrink}
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

      {/* Modal for nested data */}
      {currentData && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (modalStack.length > 1) {
              setModalStack(modalStack.slice(0, -1));
              const previous = modalStack[modalStack.length - 2];
              setCurrentData(previous.data);
              setCurrentPath(previous.path);
            } else {
              setCurrentData(null);
              setCurrentPath([]);
              setModalStack([]);
            }
          }}
          title={`Edit ${modalStack[modalStack.length - 1].title}`}
        >
          {Object.keys(currentData).map((key) => {
            const value = currentData[key];
            const isObject = typeof value === 'object' && value !== null;

            return (
              <div key={key} className="mb-4">
                <label className="block text-sm font-medium text-gray-700">{key}</label>
                {isObject ? (
                  <button
                    className="text-blue-500 underline"
                    onClick={() => {
                      setModalStack([
                        ...modalStack,
                        {
                          data: value,
                          path: [...currentPath, key],
                          title: key,
                        },
                      ]);
                      setCurrentData(value);
                      setCurrentPath([...currentPath, key]);
                    }}
                  >
                    Edit {key}
                  </button>
                ) : (
                  <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      const newData = { ...currentData, [key]: newValue };
                      setCurrentData(newData);
                      handleNestedDataChange([...currentPath, key], newValue);
                    }}
                    className="border p-1 w-full"
                  />
                )}
              </div>
            );
          })}
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (modalStack.length > 1) {
                  setModalStack(modalStack.slice(0, -1));
                  const previous = modalStack[modalStack.length - 2];
                  setCurrentData(previous.data);
                  setCurrentPath(previous.path);
                } else {
                  setCurrentData(null);
                  setCurrentPath([]);
                  setModalStack([]);
                }
              }}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Back
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default DrinksTable;
