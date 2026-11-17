import { cache } from 'react';
import { notFound } from 'next/navigation';
import { dbConnect } from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category'; // must be imported so populate() works
import ProductClient from './ProductClient';

// Cached at the edge, refreshed in the background every 60s.
export const revalidate = 60;

// No pages are prebuilt. Each product is generated on its first visit, then cached.
export async function generateStaticParams() {
  return [];
}

const plain = (d) => JSON.parse(JSON.stringify(d));

// Move the logic from your /api/products/[slug] route into here
// (and have that route call this function too, so there is one source of truth).
// React cache() makes metadata and page share a single DB query.
const getProduct = cache(async (slug) => {
  await dbConnect();

  const product = await Product.findOne({ slug, isActive: true })
    .populate('category', 'name slug type sizeChart')
    .lean();
  if (!product) return null;

  const related = await Product.find({
    isActive: true,
    category: product.category?._id,
    _id: { $ne: product._id },
  })
    .select('-description -__v')
    .limit(4)
    .lean();

  return plain({ product, related });
});

export async function generateMetadata({ params }) {
  const { slug } = await params; // on Next 14, use `params.slug` without await
  const data = await getProduct(slug);
  if (!data) return {};
  const { product } = data;
  return {
    title: product.name,
    description: product.description?.slice(0, 155),
    openGraph: { images: product.variants?.[0]?.images?.[0] ? [product.variants[0].images[0]] : [] },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const data = await getProduct(slug);
  if (!data) notFound();

  return <ProductClient key={slug} product={data.product} related={data.related} />;
}