'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Fraunces, Inter } from 'next/font/google';
import { ShoppingBag, Zap, Heart, Share2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getSizeStock, getCombinedStock } from '@/lib/stock';
import { useCart } from '@/components/CartContext';
import ColorSizeSelector from '@/components/ColorSizeSelector';
import ProductCard from '@/components/ProductCard';
import toast from 'react-hot-toast';

// Fewer weights/styles = smaller font download. display: 'swap' avoids invisible text.
const display = Fraunces({ subsets: ['latin'], weight: ['400', '500'], style: ['normal'], variable: '--font-display', display: 'swap' });
const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body', display: 'swap' });

const PAPER = '#FFFFFF';
const BLACK = '#000000';
const GREY = '#5E5E5E';
const NEUTRAL = '#8A8A8A';
const LINE = '#E7E2D6';
const GOLD = '#C9A24B';
const GOLD_DEEP = '#8C6A12';
const GOLD_BRIGHT = '#E0BC5F';
const GOLD_LIGHT = '#FBF6E9';

export default function ProductClient({ product, related }) {
  const router = useRouter();
  const { addItem } = useCart();

  // Data is already here from the server, so there is no loading state and no fetch.
  const [activeVariant, setActiveVariant] = useState(product.variants?.[0] || null);
  const [activeImage, setActiveImage] = useState(0);
  const [activeSize, setActiveSize] = useState('');
  const [activeSleeve, setActiveSleeve] = useState('');
  const [activeZip, setActiveZip] = useState('');
  const [activePantId, setActivePantId] = useState('');
  const [activeShawlId, setActiveShawlId] = useState('');
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [sizeChartIndex, setSizeChartIndex] = useState(0);

  useEffect(() => setMounted(true), []);

  const images = activeVariant?.images || [];
  const discount =
    activeVariant?.compareAtPrice > activeVariant?.price
      ? Math.round(((activeVariant.compareAtPrice - activeVariant.price) / activeVariant.compareAtPrice) * 100)
      : 0;

  const sizeChartImages = product.sizeChart?.length ? product.sizeChart : product.category?.sizeChart || [];

  const selectedSizeStock = getSizeStock(activeVariant, activeSize);
  const sizeOutOfStock = !!activeSize && selectedSizeStock <= 0;

  const selectedPant = product.pantOptions?.find((p) => p._id === activePantId) || null;
  const selectedShawl = product.shawlOptions?.find((s) => s._id === activeShawlId) || null;
  const addonTotal = (selectedPant?.price || 0) + (selectedShawl?.price || 0);
  const unitPrice = (activeVariant?.price || 0) + addonTotal;
  const unitCompareAtPrice =
    activeVariant?.compareAtPrice > activeVariant?.price ? activeVariant.compareAtPrice + addonTotal : 0;

  const stockFor = (size, pantId, shawlId) =>
    getCombinedStock(activeVariant, size, {
      pantOptions: product.pantOptions,
      pantOptionId: pantId,
      shawlOptions: product.shawlOptions,
      shawlOptionId: shawlId,
    });

  // Computed once per render (it was being recalculated in several inline functions)
  const cap = stockFor(activeSize, activePantId, activeShawlId);
  const plusDisabled = !!activeSize && cap !== Infinity && qty >= cap;
  const showLowStock = !!activeSize && cap !== Infinity && cap > 0 && cap <= 5;

  const prevImage = () => setActiveImage((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImage = () => setActiveImage((i) => (i === images.length - 1 ? 0 : i + 1));
  const prevSizeChart = () => setSizeChartIndex((i) => (i === 0 ? sizeChartImages.length - 1 : i - 1));
  const nextSizeChart = () => setSizeChartIndex((i) => (i === sizeChartImages.length - 1 ? 0 : i + 1));

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  }

  function handleColorChange(v) {
    setActiveVariant(v);
    setActiveImage(0);
    setActiveSize('');
    setQty(1);
  }

  function handleSizeChange(size) {
    setActiveSize(size);
    const stock = stockFor(size, activePantId, activeShawlId);
    setQty((q) => (stock > 0 && stock !== Infinity ? Math.min(q, stock) : 1));
  }

  function handlePantChange(id) {
    setActivePantId(id);
    const stock = stockFor(activeSize, id, activeShawlId);
    if (stock !== Infinity) setQty((q) => Math.min(q, Math.max(stock, 1)));
  }

  function handleShawlChange(id) {
    setActiveShawlId(id);
    const stock = stockFor(activeSize, activePantId, id);
    if (stock !== Infinity) setQty((q) => Math.min(q, Math.max(stock, 1)));
  }

  function buildCartPayload() {
    return {
      productId: product._id,
      variantId: activeVariant._id,
      comboId: null,
      name: product.name,
      image: activeVariant.images?.[0],
      color: activeVariant.color,
      size: activeSize,
      sleeveType: activeSleeve,
      zipType: activeZip,
      pantOption: selectedPant
        ? { id: selectedPant._id, name: selectedPant.name, price: selectedPant.price, image: selectedPant.image, sku: selectedPant.sku }
        : null,
      shawlOption: selectedShawl
        ? { id: selectedShawl._id, name: selectedShawl.name, price: selectedShawl.price, image: selectedShawl.image, sku: selectedShawl.sku }
        : null,
      price: unitPrice,
      qty,
      stock: cap,
    };
  }

  // Shared by Add to Cart and Buy Now (previously duplicated)
  function validate() {
    if (!activeSize) return toast.error('Please select a size'), false;
    if (product.sleeveOptions?.length && !activeSleeve) return toast.error('Please select a sleeve type'), false;
    if (product.zipOptions?.length && !activeZip) return toast.error('Please select a zip type'), false;
    if (cap <= 0) return toast.error('This combination is out of stock'), false;
    if (qty > cap) {
      toast.error(`Only ${cap} left in stock`);
      setQty(cap);
      return false;
    }
    return true;
  }

  function handleAddToCart() {
    if (validate()) addItem(buildCartPayload());
  }

  function handleBuyNow() {
    if (!validate()) return;
    addItem(buildCartPayload());
    router.push('/checkout');
  }

  return (
    <div className={`${body.className} ${display.variable}`} style={{ background: PAPER }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-4 sm:pt-16 pb-24 sm:pb-20">
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-16">
          {/* ── Gallery ── */}
          <div className="sm:sticky sm:top-10 sm:self-start">
            <div
              className="relative w-full h-[38vh] sm:h-auto sm:aspect-[4/5] overflow-hidden"
              style={{ background: GOLD_LIGHT, borderRadius: '4px' }}
            >
              {images[activeImage] && (
                <Image
                  key={images[activeImage]}
                  src={images[activeImage]}
                  alt={product.name}
                  fill
                  sizes="(max-width:640px) 100vw, 480px"
                  quality={75}
                  className="object-cover"
                  priority={activeImage === 0} // only the first image is the LCP
                  fetchPriority={activeImage === 0 ? 'high' : 'auto'}
                />
              )}

              {/* Warm the next image so tapping the arrow feels instant */}
              {images.length > 1 && images[(activeImage + 1) % images.length] && (
                <link
                  rel="prefetch"
                  as="image"
                  href={images[(activeImage + 1) % images.length]}
                />
              )}

              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-0 top-0 bottom-0 w-1/4 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={18} strokeWidth={1.5} style={{ color: BLACK }} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-0 top-0 bottom-0 w-1/4 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
                    aria-label="Next image"
                  >
                    <ChevronRight size={18} strokeWidth={1.5} style={{ color: BLACK }} />
                  </button>
                  <div className="absolute bottom-3 right-3 text-[11px] font-medium tracking-wide" style={{ color: BLACK }}>
                    {String(activeImage + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
                  </div>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="hidden sm:flex gap-3 mt-3">
                {images.map((img, i) => (
                  <button
                    key={img}
                    onClick={() => setActiveImage(i)}
                    className="relative w-12 h-[60px] overflow-hidden shrink-0 transition-opacity"
                    style={{
                      opacity: i === activeImage ? 1 : 0.45,
                      borderRadius: '3px',
                      boxShadow: i === activeImage ? `inset 0 -2px 0 ${GOLD}` : 'none',
                    }}
                    aria-label={`Show image ${i + 1}`}
                  >
                    <Image src={img} alt="" fill sizes="48px" quality={40} className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="hidden sm:flex items-center gap-5 mt-4">
              <button
                onClick={() => {
                  setWished((w) => !w);
                  toast.success(wished ? 'Removed from wishlist' : 'Added to wishlist');
                }}
                className="flex items-center gap-1.5 text-xs font-medium"
                style={{ color: wished ? GOLD_DEEP : GREY }}
              >
                <Heart size={14} strokeWidth={1.5} fill={wished ? GOLD : 'none'} style={{ color: wished ? GOLD : undefined }} />
                {wished ? 'Saved' : 'Save'}
              </button>
              <button onClick={handleShare} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: GREY }}>
                <Share2 size={14} strokeWidth={1.5} />
                Share
              </button>
            </div>

            {/* preload="none": videos no longer download anything until played */}
            {product.videos?.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                {product.videos.map((url) => (
                  <video
                    key={url}
                    src={url}
                    controls
                    playsInline
                    preload="none"
                    className="w-full"
                    style={{ borderRadius: '4px', background: GOLD_LIGHT }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Details ── */}
          <div className="flex flex-col">
            {product.category?.name && (
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] mb-1.5 sm:mb-2" style={{ color: GOLD_DEEP }}>
                {product.category.name}
              </p>
            )}

            <h1
              className={`${display.className} text-[20px] sm:text-[32px] leading-[1.15]`}
              style={{ color: BLACK, fontWeight: 400, letterSpacing: '-0.01em' }}
            >
              {product.name}
            </h1>

            {product.isReadyToShip && (
              <span
                className="inline-block mt-2 sm:mt-2.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide w-fit"
                style={{ background: BLACK, color: GOLD_BRIGHT, borderRadius: '4px' }}
              >
                Ready to Ship
              </span>
            )}

            <div className="flex items-baseline gap-3 mt-3 sm:mt-6">
              <span className={`${display.className} text-[22px] sm:text-[26px]`} style={{ color: BLACK, fontWeight: 500 }}>
                {formatINR(unitPrice)}
              </span>
              {unitCompareAtPrice > unitPrice && (
                <span className="line-through text-sm" style={{ color: NEUTRAL }}>
                  {formatINR(unitCompareAtPrice)}
                </span>
              )}
              {discount > 0 && (
                <span className="text-xs font-medium" style={{ color: GOLD_DEEP }}>
                  {discount}% off
                </span>
              )}
            </div>
            {addonTotal > 0 && (
              <p className="text-xs mt-1" style={{ color: GREY }}>
                Includes {formatINR(addonTotal)} for selected add-ons
              </p>
            )}

            {product.fabric && (
              <p className="hidden sm:block text-sm mt-3" style={{ color: GREY }}>
                Fabric <span style={{ color: BLACK }}>— {product.fabric}</span>
              </p>
            )}

            <div className="mt-4 pt-4 sm:mt-8 sm:pt-8" style={{ borderTop: `1px solid ${GOLD}` }}>
              <ColorSizeSelector
                variants={product.variants}
                activeVariant={activeVariant}
                onColorChange={handleColorChange}
                activeSize={activeSize}
                onSizeChange={handleSizeChange}
                categoryType={product.category?.type}
                sizeChartImages={sizeChartImages}
                onViewSizeChart={() => {
                  setSizeChartIndex(0);
                  setSizeChartOpen(true);
                }}
                sleeveOptions={product.sleeveOptions}
                zipOptions={product.zipOptions}
                activeSleeve={activeSleeve}
                onSleeveChange={setActiveSleeve}
                activeZip={activeZip}
                onZipChange={setActiveZip}
                pantOptions={product.pantOptions}
                activePantId={activePantId}
                onPantChange={handlePantChange}
                shawlOptions={product.shawlOptions}
                activeShawlId={activeShawlId}
                onShawlChange={handleShawlChange}
                formatINR={formatINR}
              />
            </div>

            <div className="flex items-center gap-4 mt-4 sm:mt-6">
              <p className="text-sm" style={{ color: GREY }}>Qty</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="text-base leading-none"
                  style={{ color: BLACK }}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="text-sm font-medium w-4 text-center" style={{ color: BLACK }}>{qty}</span>
                <button
                  onClick={() => setQty((q) => (cap > 0 && cap !== Infinity ? Math.min(cap, q + 1) : q + 1))}
                  disabled={plusDisabled}
                  className="text-base leading-none disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: BLACK }}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              {showLowStock && (
                <span className="text-xs font-medium" style={{ color: GOLD_DEEP }}>Only {cap} left</span>
              )}
              {sizeOutOfStock && <span className="text-xs" style={{ color: GREY }}>Out of stock</span>}
            </div>

            <div className="hidden sm:flex flex-col gap-2.5 mt-8">
              <button
                onClick={handleBuyNow}
                disabled={sizeOutOfStock}
                className="w-full flex items-center justify-center gap-2 font-medium py-3.5 transition-opacity active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: BLACK, color: GOLD_BRIGHT, border: `1px solid ${BLACK}`, borderRadius: '4px' }}
              >
                <Zap size={16} fill={GOLD_BRIGHT} /> {sizeOutOfStock ? 'Out of Stock' : 'Buy Now'}
              </button>
              <button
                onClick={handleAddToCart}
                disabled={sizeOutOfStock}
                className="w-full flex items-center justify-center gap-2 font-medium py-3.5 transition-opacity active:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ border: `1px solid ${BLACK}`, color: BLACK, background: PAPER, borderRadius: '4px' }}
              >
                <ShoppingBag size={15} /> {sizeOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>

            {product.description && (
              <div className="mt-6 pt-6 sm:mt-8 sm:pt-8 text-sm leading-relaxed" style={{ color: GREY, borderTop: `1px solid ${LINE}` }}>
                <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] mb-3" style={{ color: BLACK }}>
                  Description
                </h2>
                <p>{product.description}</p>
              </div>
            )}

            <div className="h-4 sm:h-0" />
          </div>
        </div>

        {related?.length > 0 && (
          <div className="mt-20 sm:mt-28">
            <h2
              className="text-[11px] font-medium uppercase tracking-[0.18em] mb-8 pb-3"
              style={{ color: BLACK, borderBottom: `1px solid ${GOLD}` }}
            >
              You may also like
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-10">
              {related.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      {/* Sticky mobile buy bar */}
      {mounted &&
        createPortal(
          <div
            className="sm:hidden fixed bottom-0 left-0 right-0 flex items-center gap-3 px-5 py-3"
            style={{ background: PAPER, borderTop: `1px solid ${GOLD}`, zIndex: 9999 }}
          >
            <div className="shrink-0">
              <p className="text-base font-medium leading-none" style={{ color: BLACK }}>{formatINR(unitPrice)}</p>
              {unitCompareAtPrice > unitPrice && (
                <p className="text-[11px] line-through leading-none mt-1" style={{ color: NEUTRAL }}>
                  {formatINR(unitCompareAtPrice)}
                </p>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={sizeOutOfStock}
              className="flex-1 flex items-center justify-center gap-1.5 font-medium py-2.5 text-sm disabled:opacity-40"
              style={{ border: `1px solid ${BLACK}`, color: BLACK, background: PAPER, borderRadius: '4px' }}
            >
              <ShoppingBag size={15} /> Cart
            </button>
            <button
              onClick={handleBuyNow}
              disabled={sizeOutOfStock}
              className="flex-1 flex items-center justify-center gap-1.5 font-medium py-2.5 text-sm disabled:opacity-40"
              style={{ background: BLACK, color: GOLD_BRIGHT, border: `1px solid ${BLACK}`, borderRadius: '4px' }}
            >
              <Zap size={15} fill={GOLD_BRIGHT} /> {sizeOutOfStock ? 'Sold out' : 'Buy now'}
            </button>
          </div>,
          document.body
        )}

      {/* Size chart modal (only mounts when opened) */}
      {mounted &&
        sizeChartOpen &&
        sizeChartImages.length > 0 &&
        createPortal(
          <div
            onClick={() => setSizeChartOpen(false)}
            className="fixed inset-0 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.88)', zIndex: 10000 }}
          >
            <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSizeChartOpen(false)}
                className="absolute -top-11 right-0 sm:-top-2 sm:-right-11 w-9 h-9 flex items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)', color: PAPER }}
                aria-label="Close size chart"
              >
                <X size={20} />
              </button>

              <div className="relative w-full aspect-square" style={{ background: PAPER, borderRadius: '4px', overflow: 'hidden' }}>
                <Image
                  src={sizeChartImages[sizeChartIndex]}
                  alt={`Size chart ${sizeChartIndex + 1} of ${sizeChartImages.length}`}
                  fill
                  className="object-contain"
                  sizes="448px"
                  quality={80}
                />
                {sizeChartImages.length > 1 && (
                  <>
                    <button
                      onClick={prevSizeChart}
                      className="absolute left-0 top-0 bottom-0 w-1/4 flex items-center justify-start pl-2"
                      aria-label="Previous size chart image"
                    >
                      <ChevronLeft size={22} strokeWidth={1.5} style={{ color: BLACK }} />
                    </button>
                    <button
                      onClick={nextSizeChart}
                      className="absolute right-0 top-0 bottom-0 w-1/4 flex items-center justify-end pr-2"
                      aria-label="Next size chart image"
                    >
                      <ChevronRight size={22} strokeWidth={1.5} style={{ color: BLACK }} />
                    </button>
                    <div className="absolute bottom-3 right-3 text-[11px] font-medium tracking-wide" style={{ color: BLACK }}>
                      {String(sizeChartIndex + 1).padStart(2, '0')} / {String(sizeChartImages.length).padStart(2, '0')}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}