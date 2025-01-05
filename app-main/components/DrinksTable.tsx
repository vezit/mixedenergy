// DrinksTable.tsx

import React, { useState, useMemo, FC } from 'react';
import Modal from './Modal';

// -- Interfaces ----------------------------------------------------------------

// Example interface for any nested object like nutrition
interface INutrition {
  [key: string]: any; // e.g. { sugar: number, calories: number }
}

// Main interface for a Drink object
interface IDrink {
  docId: string;
  // Make `name` optional to fix the "missing name" error
  // If you truly need it required, ensure your data objects actually include `name`
  name?: string;
  _stock?: number;
  size?: string;
  isSugarFree?: boolean;
  image?: string;
  _purchasePrice?: number;
  _salePrice?: number;
  nutrition?: INutrition;
  recyclingFee?: number;
  // You can allow arbitrary extra properties if your data is dynamic
  [key: string]: any;
}

// Sorting config
interface ISortConfig {
  key: string | null;
  direction: 'ascending' | 'descending';
}

// Props for DrinksTable
interface DrinksTableProps {
  // This can be an array of IDrink or an object keyed by docId
  drinks: IDrink[] | Record<string, Partial<Omit<IDrink, 'docId'>>>;
  onDrinkChange: (docId: string, path: string[], value: any) => void;
  onSaveDrink: (drink: IDrink) => void;
  onDeleteDrink: (docId: string) => void;
  onAddDrink: (newDrink: Omit<IDrink, 'docId'>) => void;
}

// -- Component -----------------------------------------------------------------

const DrinksTable: FC<DrinksTableProps> = ({
  drinks,
  onDrinkChange,
  onSaveDrink,
  onDeleteDrink,
  onAddDrink,
}) => {
  // Editing state
  const [editingRows, setEditingRows] = useState<Record<string, boolean>>({});
  // New drink modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newDrink, setNewDrink] = useState<Omit<IDrink, 'docId'>>({});
  // Nested data editing
  const [modalStack, setModalStack] = useState<
    Array<{ data: any; path: string[]; title: string }>
  >([]);
  const [currentData, setCurrentData] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  // Sorting
  const [sortConfig, setSortConfig] = useState<ISortConfig>({
    key: null,
    direction: 'ascending',
  });

  // Toggle editing mode for a specific row
  const toggleEditing = (docId: string) => {
    setEditingRows((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  // Columns to display in the table
  const columnOrder = [
    'name',
    '_stock',
    'size',
    'isSugarFree',
    'image',
    '_purchasePrice',
    '_salePrice',
    'nutrition',
    'recyclingFee',
  ];

  // Convert "drinks" prop to an array if it's an object
  const drinksArray: IDrink[] = useMemo(() => {
    if (Array.isArray(drinks)) {
      return drinks;
    } else if (drinks && typeof drinks === 'object') {
      return Object.keys(drinks).map((docId) => ({
        // Provide docId
        docId,
        // Spread the drink object (which might not include 'name', etc.)
        ...drinks[docId],
      })) as IDrink[]; 
    }
    return [];
  }, [drinks]);

  // Request sort on a specific key
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Sort the drinks array
  const sortedDrinks = useMemo(() => {
    const sortableDrinks = [...drinksArray];
    if (sortConfig.key !== null) {
      sortableDrinks.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        // Compare either as numbers or strings
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'ascending'
            ? aValue - bValue
            : bValue - aValue;
        } else {
          const result = aValue.toString().localeCompare(bValue.toString());
          return sortConfig.direction === 'ascending' ? result : -result;
        }
      });
    }
    return sortableDrinks;
  }, [drinksArray, sortConfig]);

  // Handle adding a new drink
  const handleAddDrink = () => {
    setNewDrink({
      name: '',
      _stock: 0,
      size: '',
      isSugarFree: false,
      image: '',
      _salePrice: 0,
      _purchasePrice: 0,
      nutrition: {},
      recyclingFee: 0,
    });
    setShowAddModal(true);
  };

  const handleSaveNewDrink = () => {
    onAddDrink(newDrink);
    setShowAddModal(false);
    setNewDrink({});
  };

  // Nested data changes
  const handleNestedDataChange = (path: string[], value: any) => {
    const [docId, ...restPath] = path;
    onDrinkChange(docId, restPath, value);
  };

  // If a cell is an object, we open a nested editing modal
  const handleCellClick = (drink: IDrink, key: string) => {
    const value = drink[key];
    if (typeof value === 'object' && value !== null) {
      setModalStack([{ data: value, path: [drink.docId, key], title: key }]);
      setCurrentData(value);
      setCurrentPath([drink.docId, key]);
    }
  };

  // -- Render ------------------------------------------------------------------

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Drinks</h2>
      <button
        className="mb-4 bg-green-500 text-white px-4 py-2 rounded"
        onClick={handleAddDrink}
      >
        Add New Drink
      </button>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="sticky top-0 bg-white">
            <tr>
              <th className="border px-4 py-2">Edit</th>
              {columnOrder.map((key) => (
                <th
                  key={key}
                  className="border px-4 py-2 cursor-pointer"
                  onClick={() => requestSort(key)}
                >
                  {key.startsWith('_') ? key.substring(1) : key}
                  {sortConfig.key === key
                    ? sortConfig.direction === 'ascending'
                      ? ' 🔼'
                      : ' 🔽'
                    : null}
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
                  <td className="border px-4 py-2 text-center whitespace-nowrap">
                    <button
                      className="bg-blue-500 text-white px-2 py-1 rounded"
                      onClick={() => toggleEditing(drink.docId)}
                    >
                      {isEditing ? 'Lock' : 'Edit'}
                    </button>
                  </td>

                  {columnOrder.map((key) => {
                    const value = drink[key];
                    const isObject =
                      typeof value === 'object' && value !== null;
                    const isPrivate = key.startsWith('_');

                    const cellStyle: React.CSSProperties = {
                      whiteSpace: 'nowrap',
                      maxWidth: '200px',
                    };

                    // If it's an image
                    if (key === 'image') {
                      return (
                        <td
                          key={key}
                          className={`border px-4 py-2 ${
                            isPrivate ? 'text-red-500' : ''
                          }`}
                          style={cellStyle}
                        >
                          <div className="flex flex-col items-center">
                            {typeof value === 'string' && value && (
                              <img
                                src={value}
                                alt="Drink"
                                className="h-16 w-auto mb-2"
                              />
                            )}
                            {isEditing && (
                              <input
                                type="file"
                                accept=".png"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    onDrinkChange(drink.docId, [key], e.target.files[0]);
                                  }
                                }}
                              />
                            )}
                          </div>
                        </td>
                      );
                    }

                    // If it's an object, open nested data modal
                    if (isObject) {
                      return (
                        <td
                          key={key}
                          className={`border px-4 py-2 ${
                            isPrivate ? 'text-red-500' : ''
                          }`}
                          style={cellStyle}
                        >
                          <button
                            className="text-blue-500 underline"
                            onClick={() => handleCellClick(drink, key)}
                          >
                            Edit {key}
                          </button>
                        </td>
                      );
                    }

                    // Otherwise, regular input field
                    return (
                      <td
                        key={key}
                        className={`border px-4 py-2 ${
                          isPrivate ? 'text-red-500' : ''
                        }`}
                        style={cellStyle}
                      >
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
                            key === 'isSugarFree' ? Boolean(value) : undefined
                          }
                          disabled={!isEditing || key === 'docId'}
                          className={`border p-1 w-full ${
                            isPrivate ? 'text-red-500' : ''
                          }`}
                          onChange={(e) => {
                            let newValue: any;
                            if (e.target.type === 'checkbox') {
                              newValue = e.target.checked;
                            } else if (e.target.type === 'number') {
                              newValue = e.target.valueAsNumber;
                            } else {
                              newValue = e.target.value;
                            }
                            // Only update if editable
                            if (key !== 'docId') {
                              onDrinkChange(drink.docId, [key], newValue);
                            }
                          }}
                        />
                      </td>
                    );
                  })}

                  <td className="border px-4 py-2 text-center whitespace-nowrap">
                    {isEditing && (
                      <button
                        className="bg-green-500 text-white px-2 py-1 rounded"
                        onClick={() => onSaveDrink(drink)}
                      >
                        Save
                      </button>
                    )}
                  </td>
                  <td className="border px-4 py-2 text-center whitespace-nowrap">
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
      </div>

      {/* Add New Drink Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Drink"
        >
          <div className="space-y-4">
            {columnOrder.map((key) => {
              if (key === 'docId') return null;
              const value = (newDrink as any)[key];
              const isObject = typeof value === 'object' && value !== null;
              const isPrivate = key.startsWith('_');

              return (
                <div key={key}>
                  <label
                    className={`block text-sm font-medium ${
                      isPrivate ? 'text-red-500' : 'text-gray-700'
                    }`}
                  >
                    {key.startsWith('_') ? key.substring(1) : key}
                  </label>
                  {/* image field */}
                  {key === 'image' ? (
                    <div className="flex flex-col items-center">
                      {typeof value === 'string' && value && (
                        <img
                          src={value}
                          alt="Drink"
                          className="h-16 w-auto mb-2"
                        />
                      )}
                      <input
                        type="file"
                        accept=".png"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setNewDrink((prev) => ({
                              ...prev,
                              [key]: file,
                            }));
                          }
                        }}
                      />
                    </div>
                  ) : isObject ? (
                    // If newDrink has some nested object, open nested modal
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
                    // Otherwise, standard input
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
                        key === 'isSugarFree'
                          ? Boolean(value)
                          : undefined
                      }
                      className={`border p-1 w-full ${
                        isPrivate ? 'text-red-500' : ''
                      }`}
                      onChange={(e) => {
                        let val: any = e.target.value;
                        if (e.target.type === 'checkbox') {
                          val = e.target.checked;
                        } else if (e.target.type === 'number') {
                          val = e.target.valueAsNumber;
                        }
                        setNewDrink((prev) => ({
                          ...prev,
                          [key]: val,
                        }));
                      }}
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

      {/* Nested Data Modal */}
      {currentData && modalStack.length > 0 && (
        <Modal
          isOpen={true}
          onClose={() => {
            // Close or step back in the stack
            if (modalStack.length > 1) {
              const newStack = modalStack.slice(0, -1);
              setModalStack(newStack);
              const prev = newStack[newStack.length - 1];
              setCurrentData(prev.data);
              setCurrentPath(prev.path);
            } else {
              // Close everything
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
                <label className="block text-sm font-medium text-gray-700">
                  {key}
                </label>
                {isObject ? (
                  <button
                    className="text-blue-500 underline"
                    onClick={() => {
                      const newModal = {
                        data: value,
                        path: [...currentPath, key],
                        title: key,
                      };
                      setModalStack([...modalStack, newModal]);
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
                      const updatedData = { ...currentData, [key]: newValue };
                      setCurrentData(updatedData);
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
                  const newStack = modalStack.slice(0, -1);
                  setModalStack(newStack);
                  const prev = newStack[newStack.length - 1];
                  setCurrentData(prev.data);
                  setCurrentPath(prev.path);
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
};

export default DrinksTable;
