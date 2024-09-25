// lib/products.js

const products = {
  // Bland Selv Mix Products
  'mixed-any-mix': {
    slug: 'mixed-any-mix',
    category: 'bland-selv-mix',
    title: 'Mixed Bland Selv',
    description: 'Bland Red Bull, Monster og Booster i en kasse',
    image: '/images/mixed-any-mix.jpg',
    price: '1.99',
    // array of drinks in the mix [id]
    drinks: [1,2,3],
  },
  'mixed-red-bull-mix': {
    slug: 'mixed-red-bull-mix',
    category: 'bland-selv-mix',
    title: 'Mixed Red Bull Mix',
    description: 'Bland Red Bull varianter i en kasse',
    image: '/images/mixed-red-bull-mix.jpg',
    price: '1.99',
  },
  'mixed-monster-mix': {
    slug: 'mixed-monster-mix',
    category: 'bland-selv-mix',
    title: 'Mixed Monster Mix',
    description: 'Bland Monster varianter i en kasse',
    image: '/images/mixed-monster-mix.jpg',
    price: '1.99',
  },
  'mixed-booster-mix': {
    slug: 'mixed-booster-mix',
    category: 'bland-selv-mix',
    title: 'Mixed Booster Mix',
    description: 'Bland Booster varianter i en kasse',
    image: '/images/mixed-booster-mix.jpg',
    price: '1.99',
  },
  // Vi Blander For Dig Products
  'mixed-any': {
    slug: 'mixed-any',
    category: 'vi-blander-for-dig',
    title: 'Blandet Mix',
    description: 'Bland Red Bull, Monster og Booster i en kasse',
    image: '/images/mixed-any.jpg',
    price: '1.99',
  },
  'mixed-red-bulls': {
    slug: 'mixed-red-bulls',
    category: 'vi-blander-for-dig',
    title: 'Red Bull Mix',
    description: 'Bland Red Bull varianter i en kasse',
    image: '/images/mixed-red-bulls.jpg',
    price: '1.99',
  },
  'mixed-monsters': {
    slug: 'mixed-monsters',
    category: 'vi-blander-for-dig',
    title: 'Monster Mix',
    description: 'Bland Monster varianter i en kasse',
    image: '/images/mixed-monsters.jpg',
    price: '1.99',
  },
  'mixed-boosters': {
    slug: 'mixed-boosters',
    category: 'vi-blander-for-dig',
    title: 'Booster Mix',
    description: 'Vi Blander Forskellige Booster Varianter i en kasse for dig',
    image: '/images/mixed-boosters.jpg',
    price: '1.99',
  },
};

export default products;
