// components/DrinksTable.js

import React, { useState } from 'react';
import Modal from './Modal';

function DrinksTable({ drinks, onDrinkChange, onSaveDrink, onDeleteDrink, onAddDrink }) {
  const [editingRows, setEditingRows] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDrink, setNewDrink] = useState({});
  const [modalStack, setModalStack] = useState([]);
  const [currentData, setCurrentData] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);

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

  const handleModalCellClick = (value, key, path) => {
    if (typeof value === 'object' && value !== null) {
      // Drill down further
      setModalStack([...modalStack, { data: value, path: [...path, key], title: key }]);
      setCurrentData(value);
      setCurrentPath([...path, key]);
    }
  };

  const handleBack = () => {
    const newStack = [...modalStack];
    newStack.pop();
    setModalStack(newStack);
    if (newStack.length > 0) {
      const lastItem = newStack[newStack.length - 1];
      setCurrentData(lastItem.data);
      setCurrentPath(lastItem.path);
    } else {
      setCurrentData(null);
      setCurrentPath([]);
    }
  };

  const handleModalChange = (path, key, newValue) => {
    const drinkDocId = path[0];
    const fieldPath = [...path.slice(1), key];
    onDrinkChange(drinkDocId, fieldPath, newValue);

    // Update the currentData in modal
    setCurrentData((prevData) => ({
      ...prevData,
      [key]: newValue,
    }));
  };

  const handleAddDrink = () => {
    setNewDrink({
      image: '/images/path/to/image.png',
      stock: 100,
      // id is auto-generated; we don't need to set it here
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
              <th key={key} className="border px-4 py-2">{key}</th>
            ))}
            <th className="border px-4 py-2">Save</th>
            <th className="border px-4 py-2">Delete</th>
          </tr>
        </thead>
        <tbody>
          {drinks.map((drink) => {
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
                          value={
                            key === 'isSugarFree' ? undefined : value || ''
                          }
                          checked={
                            key === 'isSugarFree' ? value || false : undefined
                          }
                          onChange={(e) => {
                            const newValue =
                              e.target.type === 'checkbox'
                                ? e.target.checked
                                : e.target.value;
                            onDrinkChange(drink.docId, [key], newValue);
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
              if (key === 'id') return null; // Do not show id field
              const value = newDrink[key];
              const isObject = typeof value === 'object' && value !== null;

              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700">
                    {key}
                  </label>
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
                      value={
                        key === 'isSugarFree' ? undefined : value || ''
                      }
                      checked={
                        key === 'isSugarFree' ? value || false : undefined
                      }
                      onChange={(e) => {
                        const val =
                          e.target.type === 'checkbox'
                            ? e.target.checked
                            : e.target.value;
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
              handleBack();
            } else {
              setCurrentData(null);
              setCurrentPath([]);
              setModalStack([]);
            }
          }}
          title={`Edit ${modalStack[modalStack.length - 1].title}`}
        >
          <div>
            {modalStack.length > 1 && (
              <button
                onClick={handleBack}
                className="mb-2 bg-gray-200 px-2 py-1 rounded"
              >
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
                  const isObject =
                    typeof value === 'object' && value !== null;
                  const path = [...currentPath];

                  return (
                    <tr key={key}>
                      <td className="border px-4 py-2">{key}</td>
                      <td className="border px-4 py-2">
                        {isObject ? (
                          <button
                            className="text-blue-500 underline"
                            onClick={() => handleModalCellClick(value, key, path)}
                          >
                            Edit {key}
                          </button>
                        ) : (
                          <input
                            type={
                              typeof value === 'number'
                                ? 'number'
                                : typeof value === 'boolean'
                                ? 'checkbox'
                                : 'text'
                            }
                            value={
                              typeof value === 'boolean'
                                ? undefined
                                : value || ''
                            }
                            checked={
                              typeof value === 'boolean' ? value || false : undefined
                            }
                            onChange={(e) => {
                              const newValue =
                                e.target.type === 'checkbox'
                                  ? e.target.checked
                                  : e.target.value;
                              handleModalChange(currentPath, key, newValue);
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
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  if (modalStack.length > 1) {
                    handleBack();
                  } else {
                    setCurrentData(null);
                    setCurrentPath([]);
                    setModalStack([]);
                  }
                }}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default DrinksTable;
