// app-main/components/DrinksTable.js

import React, { useState } from 'react';

function DrinksTable({ drinks, onDrinkChange, onSaveDrink }) {
  const [editingRows, setEditingRows] = useState({});

  const toggleEditing = (id) => {
    setEditingRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Drinks</h2>
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="border px-4 py-2">Edit</th>
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Stock</th>
            <th className="border px-4 py-2">Size</th>
            <th className="border px-4 py-2">Is Sugar Free</th>
            <th className="border px-4 py-2">Sale Price</th>
            <th className="border px-4 py-2">Purchase Price</th>
            <th className="border px-4 py-2">Package Quantity</th>
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
                <td className="border px-4 py-2">
                  <input
                    type="text"
                    value={drink.name}
                    onChange={(e) => onDrinkChange(index, 'name', e.target.value)}
                    disabled={!isEditing}
                    className="border p-1 w-full"
                  />
                </td>
                <td className="border px-4 py-2">
                  <input
                    type="number"
                    value={drink.stock}
                    onChange={(e) => onDrinkChange(index, 'stock', e.target.value)}
                    disabled={!isEditing}
                    className="border p-1 w-full"
                  />
                </td>
                <td className="border px-4 py-2">
                  <input
                    type="text"
                    value={drink.size}
                    onChange={(e) => onDrinkChange(index, 'size', e.target.value)}
                    disabled={!isEditing}
                    className="border p-1 w-full"
                  />
                </td>
                <td className="border px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={drink.isSugarFree}
                    onChange={(e) => onDrinkChange(index, 'isSugarFree', e.target.checked)}
                    disabled={!isEditing}
                  />
                </td>
                <td className="border px-4 py-2">
                  <input
                    type="number"
                    value={drink.salePrice}
                    onChange={(e) => onDrinkChange(index, 'salePrice', e.target.value)}
                    disabled={!isEditing}
                    className="border p-1 w-full"
                  />
                </td>
                <td className="border px-4 py-2">
                  <input
                    type="number"
                    value={drink.purchasePrice}
                    onChange={(e) => onDrinkChange(index, 'purchasePrice', e.target.value)}
                    disabled={!isEditing}
                    className="border p-1 w-full"
                  />
                </td>
                <td className="border px-4 py-2">
                  <input
                    type="number"
                    value={drink.packageQuantity}
                    onChange={(e) => onDrinkChange(index, 'packageQuantity', e.target.value)}
                    disabled={!isEditing}
                    className="border p-1 w-full"
                  />
                </td>
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
    </div>
  );
}

export default DrinksTable;
