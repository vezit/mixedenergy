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

  // Define the desired column order
  const columnOrder = [
    'title',
    'slug',
    'description',
    'category',
    'image',
    '_salePrice', // Private field
    'collectionsDrinks',
    'packages',
  ];

  // Function to handle sorting
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
    if (key === 'collectionsDrinks') {
      setCurrentPackage(pkg);
      setSelectedDrinks(pkg.collectionsDrinks || []);
      setModalType('drinksSelection');
    } else if (key === 'packages') {
      // Handle editing nested packages array
      setCurrentPackage(pkg);
      setPackagesData(pkg.packages || []);
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
      '_salePrice': 0,
      collectionsDrinks: [],
      packages: [],
    });
    setShowAddModal(true);
  };

  const handleSaveNewPackage = () => {
    onAddPackage(newPackage);
    setShowAddModal(false);
    setNewPackage({});
  };

  // Function to update newPackage state
  const updateNewPackageField = (key, value) => {
    setNewPackage((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Function to update currentPackage state (for editing)
  const updateCurrentPackageField = (key, value) => {
    const updatedPackage = { ...currentPackage };
    updatedPackage[key] = value;
    onPackageChange(currentPackage.docId, [key], value);
    setCurrentPackage(updatedPackage);
  };

  // Packages Editing Modal state
  const [packagesData, setPackagesData] = useState([]);

  // Open Packages Editing Modal
  const handleOpenPackagesModal = (pkg) => {
    setCurrentPackage(pkg);
    setPackagesData(pkg.packages || []);
    setModalType('packagesEditing');
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
                  <td className="border px-4 py-2 text-center whitespace-nowrap">
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
                    const isPrivate = key.startsWith('_');

                    // Adjust cell width based on content
                    const cellStyle = {
                      whiteSpace: 'nowrap',
                      maxWidth: '200px',
                    };

                    return (
                      <td
                        key={key}
                        className={`border px-4 py-2 ${isPrivate ? 'text-red-500' : ''}`}
                        style={cellStyle}
                      >
                        {key === 'image' ? (
                          <div className="flex flex-col items-center">
                            {typeof value === 'string' && value && (
                              <img src={value} alt="Package" className="h-16 w-auto mb-2" />
                            )}
                            {isEditing && (
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    onPackageChange(pkg.docId, [key], file);
                                  }
                                }}
                              />
                            )}
                          </div>
                        ) : key === 'collectionsDrinks' || key === 'packages' ? (
                          <button
                            className="text-blue-500 underline"
                            onClick={() => handleCellClick(pkg, key)}
                          >
                            {key === 'collectionsDrinks'
                              ? 'Manage Drinks'
                              : 'Edit Packages'}
                          </button>
                        ) : isObject ? (
                          <span>{JSON.stringify(value)}</span>
                        ) : (
                          <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              onPackageChange(pkg.docId, [key], newValue);
                            }}
                            disabled={!isEditing || key === 'docId'}
                            className={`border p-1 w-full ${isPrivate ? 'text-red-500' : ''}`}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="border px-4 py-2 text-center whitespace-nowrap">
                    {isEditing && (
                      <button
                        className="bg-green-500 text-white px-2 py-1 rounded"
                        onClick={() => onSavePackage(pkg)}
                      >
                        Save
                      </button>
                    )}
                  </td>
                  <td className="border px-4 py-2 text-center whitespace-nowrap">
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
      </div>

      {/* Add New Package Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Package"
        >
          <div className="space-y-4">
            {columnOrder.map((key) => {
              if (key === 'docId') return null;
              const value = newPackage[key];
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
                  {key === 'image' ? (
                    <div className="flex flex-col items-center">
                      {typeof value === 'string' && value && (
                        <img src={value} alt="Package" className="h-16 w-auto mb-2" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            updateNewPackageField(key, file);
                          }
                        }}
                      />
                    </div>
                  ) : key === 'collectionsDrinks' || key === 'packages' ? (
                    <button
                      className="text-blue-500 underline"
                      onClick={() => {
                        setCurrentPackage(newPackage);
                        if (key === 'collectionsDrinks') {
                          setSelectedDrinks(newPackage.collectionsDrinks || []);
                          setModalType('drinksSelectionForNewPackage');
                        } else if (key === 'packages') {
                          setPackagesData(newPackage.packages || []);
                          setModalType('packagesEditingForNewPackage');
                        }
                      }}
                    >
                      {key === 'collectionsDrinks'
                        ? 'Manage Drinks'
                        : 'Edit Packages'}
                    </button>
                  ) : isObject ? (
                    <textarea
                      value={JSON.stringify(value, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsedValue = JSON.parse(e.target.value);
                          updateNewPackageField(key, parsedValue);
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
                        updateNewPackageField(key, val);
                      }}
                      className={`border p-1 w-full ${isPrivate ? 'text-red-500' : ''}`}
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
      {(modalType === 'drinksSelection' || modalType === 'drinksSelectionForNewPackage') && (
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
                  {Object.keys(drinks)
                    .filter((drinkSlug) => !selectedDrinks.includes(drinkSlug))
                    .map((drinkSlug) => (
                      <li
                        key={drinkSlug}
                        onDoubleClick={() => {
                          setSelectedDrinks([...selectedDrinks, drinkSlug]);
                        }}
                        className="p-2 hover:bg-gray-200 cursor-pointer"
                      >
                        {drinks[drinkSlug].name}
                      </li>
                    ))}
                </ul>
              </div>
              <button
                onClick={() => setSelectedDrinks(Object.keys(drinks))}
                className="mt-2 bg-blue-500 text-white px-2 py-1 rounded"
              >
                Choose All
              </button>
            </div>
            <div className="w-1/2">
              <h3 className="text-lg font-bold mb-2">Selected Drinks</h3>
              <div className="border h-64 overflow-y-scroll">
                <ul>
                  {selectedDrinks.map((drinkSlug) => {
                    const drink = drinks[drinkSlug];
                    return (
                      <li
                        key={drinkSlug}
                        onDoubleClick={() => {
                          setSelectedDrinks(
                            selectedDrinks.filter((slug) => slug !== drinkSlug)
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
                if (modalType === 'drinksSelection') {
                  onPackageChange(currentPackage.docId || null, ['collectionsDrinks'], selectedDrinks);
                } else {
                  updateNewPackageField('collectionsDrinks', selectedDrinks);
                }
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

      {/* Packages Editing Modal */}
      {(modalType === 'packagesEditing' || modalType === 'packagesEditingForNewPackage') && (
        <Modal
          isOpen={true}
          onClose={() => {
            setModalType(null);
            setPackagesData([]);
          }}
          title="Edit Packages"
        >
          <div className="space-y-4">
            {packagesData.map((pkgItem, index) => (
              <div key={index} className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Size"
                  value={pkgItem.size}
                  onChange={(e) => {
                    const updatedPackages = [...packagesData];
                    updatedPackages[index].size = parseInt(e.target.value);
                    setPackagesData(updatedPackages);
                  }}
                  className="border p-1 w-full"
                />
                <input
                  type="number"
                  placeholder="Round Up Or Down"
                  value={pkgItem.roundUpOrDown}
                  onChange={(e) => {
                    const updatedPackages = [...packagesData];
                    updatedPackages[index].roundUpOrDown = parseInt(e.target.value);
                    setPackagesData(updatedPackages);
                  }}
                  className="border p-1 w-full"
                />
                <input
                  type="number"
                  placeholder="Discount"
                  value={pkgItem.discount}
                  onChange={(e) => {
                    const updatedPackages = [...packagesData];
                    updatedPackages[index].discount = parseFloat(e.target.value);
                    setPackagesData(updatedPackages);
                  }}
                  className="border p-1 w-full"
                />
                <button
                  onClick={() => {
                    const updatedPackages = [...packagesData];
                    updatedPackages.splice(index, 1);
                    setPackagesData(updatedPackages);
                  }}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                setPackagesData([
                  ...packagesData,
                  { size: 0, roundUpOrDown: 0, discount: 1 },
                ]);
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Add Package
            </button>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                if (modalType === 'packagesEditing') {
                  onPackageChange(currentPackage.docId || null, ['packages'], packagesData);
                } else {
                  updateNewPackageField('packages', packagesData);
                }
                setModalType(null);
                setPackagesData([]);
              }}
              className="bg-green-500 text-white px-4 py-2 rounded mr-2"
            >
              Save
            </button>
            <button
              onClick={() => {
                setModalType(null);
                setPackagesData([]);
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
