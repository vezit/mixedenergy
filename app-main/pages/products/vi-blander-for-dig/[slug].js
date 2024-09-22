// pages/products/vi-blander-for-dig/[slug].js

import { useRouter } from 'next/router';
import { useState } from 'react';
import { useBasket } from '../../../lib/BasketContext';
import products from '../../../lib/products'; // Adjust the path if necessary
import Link from 'next/link';

export default function ViBlanderForDigProduct() {
  const router = useRouter();
  const { slug } = router.query;
  const product = products[slug]; // Assuming you have a products data object

  if (!product) {
    return <p>Indlæser...</p>;
  }

  // Implement the logic for individual product pages here
  // For example, display product details and allow customers to regenerate mixes

  return (
    <div>
      <h1>{product.title}</h1>
      {/* Rest of your product detail code */}
    </div>
  );
}
