// lib/filterData.js

/**
 * Recursively filters out properties that start with an underscore, with optional infinite depth.
 * @param data - The object to filter.
 * @param depth - How deep the filter should go. Set to Infinity for unlimited depth.
 * @returns A new object with properties starting with an underscore removed.
 *
 * Example usage:
 *  const data = {
 *    name: 'Session Name',
 *    _private: 'Hidden',
 *    details: {
 *      description: 'Visible',
 *      _sensitiveInfo: 'Hidden',
 *      nested: {
 *        keepThis: 'Visible',
 *        _secret: 'Hidden'
 *      }
 *    }
 *  };
 *
 * filterData(data, Infinity); // Removes all underscore-prefixed keys at any depth
 */
export function filterData(data: any, depth: number = Infinity): any {
  // Stop if depth is less than 1, or if data is not an object
  if (depth < 1 || typeof data !== 'object' || data === null) return data;

  if (Array.isArray(data)) {
    // If data is an array, map over its elements
    return data.map((item) => filterData(item, depth === Infinity ? Infinity : depth - 1));
  } else {
    // If data is an object, reduce its keys
    return Object.keys(data).reduce((acc: Record<string, any>, key: string) => {
      // Only include keys that don't start with an underscore
      if (!key.startsWith('_')) {
        acc[key] =
          typeof data[key] === 'object'
            ? filterData(data[key], depth === Infinity ? Infinity : depth - 1)
            : data[key];
      }
      return acc;
    }, {});
  }
}
