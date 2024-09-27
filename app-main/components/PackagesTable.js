import React, { useState } from 'react';
import Select from 'react-select';

function PackagesTable({ packages, drinks, onPackageChange, onSavePackage }) {
  const [editingRows, setEditingRows] = useState({});
  const drinkOptions = drinks.map((drink) => ({ value: drink.id, label: drink.name }));

  const toggleEditing = (id) => {
    setEditingRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Packages</h2>
      <table className="min-w-full border-collapse">
        <thead>
          {/* ... table headers */}
        </thead>
        <tbody>
          {packages.map((pkg, index) => {
            const isEditing = editingRows[pkg.id] || false;
            return (
              <tr key={pkg.id} className="border-b">
                {/* ... other table cells */}
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
    </div>
  );
}

export default PackagesTable;
