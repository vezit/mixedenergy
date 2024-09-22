// pages/products/vi-blander-for-dig/[slug].js

import products from '../../../lib/products';

export default function ViBlanderForDigProduct({ product }) {
  if (!product) {
    return <p>Produkt ikke fundet.</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{product.title}</h1>
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/2">
          <img src={product.image} alt={product.title} className="w-full h-auto" />
        </div>
        <div className="md:w-1/2 md:pl-4">
          <p>{product.description}</p>
          <p className="text-xl font-semibold">Pris: {product.price} DKK</p>
          {/* Add more product details or actions (e.g., Add to Basket) as needed */}
        </div>
      </div>
    </div>
  );
}

export async function getStaticPaths() {
  const slugs = Object.keys(products).filter(
    (slug) => products[slug].category === 'vi-blander-for-dig'
  );

  const paths = slugs.map((slug) => ({
    params: { slug },
  }));

  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const product = products[params.slug];

  if (!product || product.category !== 'vi-blander-for-dig') {
    return { notFound: true };
  }

  return {
    props: {
      product,
    },
  };
}
