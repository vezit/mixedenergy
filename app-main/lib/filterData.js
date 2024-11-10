/**
 * Recursively filters out properties that start with an underscore, with optional infinite depth.
 * @param {Object} data - The object to filter.
 * @param {number} depth - How deep the filter should go. Set to Infinity for unlimited depth.
 * @returns {Object} - A new object with properties starting with an underscore removed.
 *
 * Example Usage:
 *
 * const data = {
 *   name: 'Session Name',
 *   _private: 'Hidden',
 *   details: {
 *     description: 'Visible',
 *     _sensitiveInfo: 'Hidden',
 *     nested: {
 *       keepThis: 'Visible',
 *       _secret: 'Hidden'
 *     }
 *   }
 * };
 *
 * filterData(data, Infinity); // Removes all underscore-prefixed keys at any depth
 */
export function filterData(data, depth = Infinity) {
    // Stop if depth is less than 1, or if data is not an object
    if (depth < 1 || typeof data !== 'object' || data === null) return data;
  
    return Object.keys(data).reduce((acc, key) => {
      // Only include keys that don't start with an underscore
      if (!key.startsWith('_')) {
        // If the value is an object, filter recursively without decreasing depth for unlimited levels
        acc[key] = typeof data[key] === 'object' 
          ? filterData(data[key], depth === Infinity ? Infinity : depth - 1)
          : data[key];
      }
      return acc;
    }, {});
  }
  