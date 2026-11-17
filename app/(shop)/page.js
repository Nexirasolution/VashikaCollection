import { dbConnect } from '@/lib/mongodb';
import Banner from '@/models/Banner';
import Product from '@/models/Product';
import Review from '@/models/Review';
import Combo from '@/models/Combo';
import Category from '@/models/Category';
import BannerCarousel from '@/components/BannerCarousel';
import ProductCard from '@/components/ProductCard';
import ReviewSection from '@/components/ReviewSection';

import Link from 'next/link';
import Image from 'next/image';
import { formatINR } from '@/lib/utils';
import { ArrowRight, Tag } from 'lucide-react';

// Static page, rebuilt in the background at most once per minute.
// Replaces `force-dynamic`, so visitors get a cached page from the edge
// instead of waiting on MongoDB on every request.
export const revalidate = 60;

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const GOLD_WASH = '#F6EFD9';
const HAIRLINE = '#E8E8E8';
const FONT_SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const FEATURED_LIMIT = 6;

// Adjust these to the fields ProductCard really uses.
// Skipping large fields (description, etc.) shrinks the HTML payload.
const PRODUCT_FIELDS = '-description -__v';

const plain = (data) => JSON.parse(JSON.stringify(data));

async function getData() {
  await dbConnect();
  const [banners, newArrivals, reviews, combos, categories] = await Promise.all([
    Banner.find({ isActive: true })
      .select('image link title sortOrder')
      .sort({ sortOrder: 1 })
      .limit(5)
      .lean(),
    Product.find({ isActive: true, isActiveSeller: true })
      .select(PRODUCT_FIELDS)
      .sort({ createdAt: -1 })
      .limit(FEATURED_LIMIT)
      .lean(),
    Review.find({ isApproved: true, isFeatured: true })
      .populate('product', 'name')
      .limit(10)
      .lean(),
    Combo.find({ isActive: true })
      .select('name slug type images image comboPrice originalPrice packOptions')
      .limit(6)
      .lean(),
    Category.find({ isActive: true, parent: null })
      .select('name slug image')
      .limit(10)
      .lean(),
  ]);

  return plain({ banners, newArrivals, reviews, combos, categories });
}

export default async function HomePage() {
  const { banners, newArrivals, reviews, combos, categories } = await getData();

  return (
    <div className="overflow-x-hidden bg-white">
      {/* Banner */}
      <BannerCarousel banners={banners} />

      {/* Shop by Category */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pt-14 pb-6">
          <h2
            className="text-xl sm:text-2xl font-bold tracking-[3px] uppercase mb-6 text-center"
            style={{ color: INK, fontFamily: FONT_SANS }}
          >
            Shop by Category
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 sm:gap-6">
            {categories.map((c) => (
              <Link
                key={c._id}
                href={`/category/${c.slug}`}
                className="group flex flex-col items-center text-center"
              >
                <div
                  className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-neutral-50 transition-transform duration-300 group-hover:scale-105"
                  style={{ border: `1px solid ${GOLD}` }}
                >
                  {c.image ? (
                    <Image
                      src={c.image}
                      alt={c.name}
                      fill
                      sizes="(min-width: 768px) 96px, (min-width: 640px) 80px, 64px"
                      quality={60}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full" style={{ background: GOLD_WASH }} />
                  )}
                </div>
                <span
                  className="mt-2 text-[10.5px] sm:text-[11px] font-bold tracking-wide leading-tight line-clamp-2 max-w-[80px]"
                  style={{ color: INK, fontFamily: FONT_SANS }}
                >
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured collection */}
      <section className="max-w-6xl mx-auto px-4 pt-8 sm:pt-10 pb-16 text-center">
        <h2
          className="text-lg sm:text-xl font-bold tracking-[3px] uppercase"
          style={{ color: INK, fontFamily: FONT_SANS }}
        >
          Featured Collection
        </h2>

        {newArrivals.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 mt-8 text-left">
            {newArrivals.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}

        <Link
          href="/products"
          className="inline-block mt-10 px-8 py-3 text-[12px] font-bold tracking-[2px] uppercase transition-colors bg-black text-[#C9A227] border border-[#C9A227] hover:bg-[#C9A227] hover:text-black"
          style={{ fontFamily: FONT_SANS }}
        >
          Shop the collection
        </Link>
      </section>

      {/* Combo Offers */}
      {combos.length > 0 && (
        <section className="py-16 bg-white border-t" style={{ borderColor: HAIRLINE }}>
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col items-center text-center mb-8">
              <span
                className="text-[11px] font-bold uppercase tracking-[3px] mb-3 px-3 py-1"
                style={{ color: INK, background: GOLD, fontFamily: FONT_SANS }}
              >
                Save More
              </span>
              <h2
                className="text-xl sm:text-2xl font-bold tracking-[1px]"
                style={{ color: INK, fontFamily: FONT_SANS }}
              >
                Combo Offers
              </h2>
              <p className="text-sm mt-1 font-light" style={{ color: INK_SOFT, fontFamily: FONT_SANS }}>
                Buy together, save together
              </p>
              <Link
                href="/combo"
                className="hidden sm:flex items-center gap-1 text-sm font-bold hover:gap-2 transition-all mt-3"
                style={{ color: INK, fontFamily: FONT_SANS }}
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
              {combos.map((c) => {
                const isColorPack = c.type === 'color-pack';
                const cheapestPack =
                  isColorPack && c.packOptions?.length
                    ? c.packOptions.reduce((min, p) => (p.price < min.price ? p : min), c.packOptions[0])
                    : null;

                const cover = c.images?.[0] || c.image;
                const displayPrice = isColorPack ? cheapestPack?.price ?? 0 : c.comboPrice;
                const displayOriginal = isColorPack ? cheapestPack?.originalPrice ?? 0 : c.originalPrice;
                const savings = displayOriginal > displayPrice ? displayOriginal - displayPrice : 0;
                const pct = displayOriginal > 0 ? Math.round((savings / displayOriginal) * 100) : 0;

                return (
                  <Link
                    key={c._id}
                    href={`/combo/${c.slug}`}
                    className="group relative overflow-hidden bg-white transition-colors"
                    style={{ border: `1px solid ${HAIRLINE}` }}
                  >
                    <div className="relative w-full aspect-square overflow-hidden bg-neutral-50">
                      {cover ? (
                        <Image
                          src={cover}
                          alt={c.name}
                          fill
                          sizes="(min-width: 1152px) 360px, (min-width: 640px) 33vw, 50vw"
                          quality={70}
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full" style={{ background: GOLD_WASH }} />
                      )}
                      {pct > 0 && (
                        <div
                          className="absolute top-2 left-2 z-[1] text-[10px] font-bold px-2 py-0.5 flex items-center gap-1"
                          style={{ color: INK, background: GOLD, fontFamily: FONT_SANS }}
                        >
                          <Tag size={9} /> {pct}% off
                        </div>
                      )}
                      {isColorPack && (
                        <div
                          className="absolute top-2 right-2 z-[1] text-[10px] font-medium px-2 py-0.5"
                          style={{ background: INK, color: '#fff' }}
                        >
                          Color Pack
                        </div>
                      )}
                    </div>

                    <div className="p-3" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
                      <p
                        className="text-[13px] font-bold tracking-wide line-clamp-1"
                        style={{ color: INK, fontFamily: FONT_SANS }}
                      >
                        {c.name}
                      </p>
                      <div className="flex items-baseline gap-2 mt-1.5">
                        <span className="font-bold text-sm" style={{ color: INK, fontFamily: FONT_SANS }}>
                          {isColorPack && 'From '}
                          {formatINR(displayPrice)}
                        </span>
                        {savings > 0 && (
                          <span
                            className="text-[11px] line-through font-light"
                            style={{ color: INK_SOFT, fontFamily: FONT_SANS }}
                          >
                            {formatINR(displayOriginal)}
                          </span>
                        )}
                      </div>
                      {savings > 0 && (
                        <p
                          className="text-[10.5px] font-bold mt-1 tracking-wide uppercase"
                          style={{ color: INK_SOFT, fontFamily: FONT_SANS }}
                        >
                          Save {formatINR(savings)}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link href="/combo" className="text-sm font-bold" style={{ color: INK, fontFamily: FONT_SANS }}>
                View all combos →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      <ReviewSection reviews={reviews} />
    </div>
  );
}