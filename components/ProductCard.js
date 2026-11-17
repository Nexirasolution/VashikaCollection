'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatINR } from '@/lib/utils';
import { getVariantTotalStock } from '@/lib/stock';
import { useWishlist } from '@/components/WhishlistContext';
import { useCart } from '@/components/CartContext';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const GOLD_WASH = '#F6EFD9';
const LINE = '#E8E8E8';
const DISABLED = '#BDBDBD';
const PAPER = '#FFFFFF';
const FONT_SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const OPTION_FIELDS = ['sleeveOptions', 'zipOptions'];

// Grid is 2 cols on mobile, 3 on tablet, 4 on desktop, so each image is
// about 50vw / 33vw / 25vw wide, not 100vw. This alone cuts image bytes a lot.
const DEFAULT_SIZES = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';

// Hoisted so these objects are not recreated on every render
const ROOT_STYLE = { background: PAPER, fontFamily: FONT_SANS };
const IMG_WRAP_STYLE = { background: GOLD_WASH };
const TITLE_STYLE = { color: INK, lineHeight: 1.375, minHeight: '2.75em' };
const WISH_BTN_STYLE = { background: 'rgba(255,255,255,0.92)' }; // blur removed: backdrop-filter is costly to paint on many cards
const OOS_BTN_STYLE = { background: LINE, color: INK_SOFT };
const BADGE_BASE = 'text-[11px] font-semibold uppercase tracking-wider';
const BADGE_PAD = { padding: '5px 12px', borderRadius: '999px' };
const BADGE_OOS = { color: PAPER, background: INK_SOFT, ...BADGE_PAD };
const BADGE_LOW = { color: PAPER, background: INK, ...BADGE_PAD };
const BADGE_SALE = { color: INK, background: GOLD, ...BADGE_PAD };

const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 h-11 md:h-10 rounded-md text-[12px] sm:text-[13px] font-medium tracking-wide whitespace-nowrap transition-[background-color,color,transform] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed';

const BTN_CART = `${BTN_BASE} w-11 shrink-0 md:w-auto md:flex-1 md:px-3 bg-white text-black border border-[#C9A227] hover:bg-[#F6EFD9]`;
const BTN_CART_ADDED = `${BTN_BASE} w-11 shrink-0 md:w-auto md:flex-1 md:px-3 bg-[#F6EFD9] text-black border border-[#C9A227]`;
const BTN_BUY = `${BTN_BASE} flex-1 px-3 bg-black text-[#C9A227] border border-[#C9A227] hover:bg-[#C9A227] hover:text-black`;
const BTN_FULL = `${BTN_BASE} w-full px-3 bg-black text-[#C9A227] border border-[#C9A227] hover:bg-[#C9A227] hover:text-black`;

function ProductCard({ product, priority = false, sizes = DEFAULT_SIZES }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const variant = product.variants?.[0];
  const image = variant?.images?.[0] || '/placeholder.png';
  const price = product.basePrice || variant?.price || 0;
  const compareAt = variant?.compareAtPrice || 0;
  const discountPct = compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  const sizeList = variant?.sizes || [];
  const hasSizes = sizeList.length > 0;

  const totalStock = getVariantTotalStock(variant);
  const outOfStock = totalStock <= 0;
  const lowStock = !outOfStock && totalStock <= 5;

  const [selectedSize, setSelectedSize] = useState(() =>
    sizeList.length === 1 && sizeList[0].stock > 0 ? sizeList[0].size : ''
  );
  const [added, setAdded] = useState(false);
  const selectedStock = sizeList.find((s) => s.size === selectedSize)?.stock ?? 0;

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(t);
  }, [added]);

  const needsProductPage = OPTION_FIELDS.some((k) => product[k]?.length > 0) || !hasSizes;

  const wishlistId = product.id ?? product._id ?? product.slug;
  const wishlisted = isWishlisted(wishlistId);
  const href = `/product/${product.slug}`;

  const handleWishlistClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(wishlistId);
    },
    [toggleWishlist, wishlistId]
  );

  function buildItem() {
    return {
      productId: product._id ?? product.id,
      slug: product.slug,
      variantId: variant?._id,
      name: product.name,
      image,
      color: variant?.color || '-',
      colorHex: variant?.colorHex,
      size: selectedSize,
      price,
      stock: selectedStock,
      qty: 1,
    };
  }

  function requireSize() {
    if (!selectedSize) {
      toast.error('Please select a size');
      return false;
    }
    return true;
  }

  function handleAddToCart() {
    if (!requireSize()) return;
    addItem(buildItem());
    setAdded(true);
  }

  function handleBuyNow() {
    if (!requireSize()) return;
    addItem(buildItem());
    router.push('/checkout');
  }

  return (
    <div style={ROOT_STYLE}>
      {/* Image */}
      <div className="relative">
        {/* prefetch={false}: a grid of cards would otherwise prefetch every
            product page as it scrolls into view, which competes with images */}
        <Link href={href} prefetch={false} className="block" aria-label={product.name}>
          <div className="relative aspect-[3/4] overflow-hidden" style={IMG_WRAP_STYLE}>
            <Image
              src={image}
              alt={product.name}
              fill
              sizes={sizes}
              quality={70}
              priority={priority}
              className={`object-cover ${outOfStock ? 'grayscale opacity-70' : ''}`}
            />
          </div>
        </Link>

        <div className="absolute top-3 left-3 pointer-events-none">
          {outOfStock ? (
            <span className={BADGE_BASE} style={BADGE_OOS}>Out of stock</span>
          ) : lowStock ? (
            <span className={BADGE_BASE} style={BADGE_LOW}>{totalStock} left</span>
          ) : discountPct > 0 ? (
            <span className={BADGE_BASE} style={BADGE_SALE}>Sale</span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleWishlistClick}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
          className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full transition-transform active:scale-90"
          style={WISH_BTN_STYLE}
        >
          <Heart
            className="w-4 h-4"
            strokeWidth={2}
            style={{ color: wishlisted ? GOLD : INK }}
            fill={wishlisted ? GOLD : 'none'}
          />
        </button>
      </div>

      {/* Title + price */}
      <Link href={href} prefetch={false} className="block pt-3">
        <h3 className="text-[13px] sm:text-sm font-medium line-clamp-2" style={TITLE_STYLE}>
          {product.name}
        </h3>

        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
          <span className="font-bold text-base sm:text-lg" style={{ color: INK }}>
            {formatINR(price)}
          </span>
          {compareAt > price && (
            <span className="text-xs sm:text-sm line-through font-light" style={{ color: INK_SOFT }}>
              {formatINR(compareAt)}
            </span>
          )}
          {discountPct > 0 && (
            <span className="text-xs font-medium" style={{ color: INK }}>
              Save {discountPct}%
            </span>
          )}
        </div>
      </Link>

      {/* Size chips */}
      {!outOfStock && !needsProductPage && (
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Select size">
          {sizeList.map((s) => {
            const soldOut = s.stock <= 0;
            const active = selectedSize === s.size;
            return (
              <button
                key={s.size}
                type="button"
                disabled={soldOut}
                onClick={() => setSelectedSize(s.size)}
                aria-pressed={active}
                className="min-w-[30px] h-7 px-2 text-[11px] font-medium transition-colors"
                style={{
                  borderRadius: '4px',
                  border: `1px solid ${active ? INK : LINE}`,
                  background: active ? INK : PAPER,
                  color: soldOut ? DISABLED : active ? PAPER : INK,
                  textDecoration: soldOut ? 'line-through' : 'none',
                  cursor: soldOut ? 'not-allowed' : 'pointer',
                }}
              >
                {s.size}
              </button>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-stretch gap-2">
        {outOfStock ? (
          <button type="button" disabled className={`${BTN_BASE} w-full`} style={OOS_BTN_STYLE}>
            Out of stock
          </button>
        ) : needsProductPage ? (
          <Link href={href} prefetch={false} className={BTN_FULL}>
            Choose options
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={handleAddToCart}
              className={added ? BTN_CART_ADDED : BTN_CART}
              aria-label="Add to cart"
              title="Add to cart"
            >
              {added ? <Check size={16} strokeWidth={2} /> : <ShoppingBag size={16} strokeWidth={1.5} />}
              <span className="hidden md:inline">{added ? 'Added' : 'Add to cart'}</span>
            </button>

            <button type="button" onClick={handleBuyNow} className={BTN_BUY}>
              Buy now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Skips re-rendering when the parent re-renders with the same product
export default memo(ProductCard);