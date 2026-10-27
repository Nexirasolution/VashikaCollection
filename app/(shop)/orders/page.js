'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Package, Phone, Truck } from 'lucide-react';
import { formatINR } from '@/lib/utils';

// White, black and gold palette (matches the invoice and success pages)
const PAPER = '#FFFFFF';
const BLACK = '#000000';
const GREY = '#5E5E5E';          // secondary text on white
const GREY_WASH = '#F3F3F3';
const LINE = '#E7E2D6';          // hairlines
const GOLD = '#C9A24B';          // rules, accents
const GOLD_DEEP = '#8C6A12';     // gold text on white (readable contrast)
const GOLD_BRIGHT = '#E0BC5F';   // gold text on black
const GOLD_LIGHT = '#FBF6E9';    // very light gold surface
const GOLD_WASH = '#F3E7C4';     // light gold badge
const ALERT = '#A33A2B';         // errors and cancelled only, so they still read as problems
const ALERT_WASH = '#FBECE9';
const FONT_SERIF = "Georgia, 'Times New Roman', serif";

const STATUS_STYLES = {
  placed:    { color: GREY,        background: GREY_WASH },
  confirmed: { color: GOLD_DEEP,   background: GOLD_LIGHT },
  packed:    { color: GOLD_DEEP,   background: GOLD_LIGHT },
  shipped:   { color: GOLD_DEEP,   background: GOLD_WASH },
  delivered: { color: GOLD_BRIGHT, background: BLACK },
  cancelled: { color: ALERT,       background: ALERT_WASH },
  returned:  { color: GREY,        background: GREY_WASH },
};

const KEEP_COLORS = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };

export default function OrdersPage() {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLookup(e) {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, '').slice(-10);
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    setError('');
    setLoading(true);
    setOrders(null);
    try {
      const res = await fetch('/api/orders/by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }
      setOrders(data.orders || []);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-10 sm:py-14 min-h-[60vh]" style={{ background: PAPER }}>
      <div className="mb-7 pb-6" style={{ borderBottom: `1px solid ${GOLD}` }}>
        <h1 className="text-[24px] sm:text-[28px] mb-1.5" style={{ fontFamily: FONT_SERIF, color: BLACK }}>
          My Orders
        </h1>
        <p className="text-sm" style={{ color: GREY }}>
          Enter the phone number you used at checkout to view your orders.
        </p>
      </div>

      <form onSubmit={handleLookup} className="flex gap-2 mb-2">
        <div className="flex-1 relative">
          <Phone size={14} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: GREY }} />
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit phone number"
            maxLength={10}
            className="w-full pl-9 pr-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-black"
            style={{ border: `1px solid ${LINE}`, borderRadius: '3px', color: BLACK, background: PAPER }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="text-sm font-medium px-5 py-2.5 shrink-0 transition-opacity active:opacity-80 disabled:opacity-50"
          style={{ background: BLACK, color: GOLD_BRIGHT, borderRadius: '3px', ...KEEP_COLORS }}
        >
          {loading ? 'Searching…' : 'Find Orders'}
        </button>
      </form>

      {error && <p className="text-sm mb-4" style={{ color: ALERT }}>{error}</p>}

      {orders !== null && orders.length === 0 && !error && (
        <div className="text-center py-16">
          <Package size={26} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: GOLD }} />
          <p className="text-sm" style={{ color: GREY }}>No orders found for this number</p>
        </div>
      )}

      <div className="space-y-4 mt-6">
        {orders?.map((o) => {
          const statusStyle = STATUS_STYLES[o.status] || { color: GREY, background: GREY_WASH };
          return (
            <div key={o._id} className="p-4" style={{ border: `1px solid ${LINE}`, borderRadius: '4px', background: PAPER }}>
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-xs font-medium" style={{ color: BLACK }}>#{o.orderNumber}</span>
                <span
                  className="text-[10.5px] font-medium px-2.5 py-1 capitalize"
                  style={{ ...statusStyle, borderRadius: '3px', ...KEEP_COLORS }}
                >
                  {o.status}
                </span>
              </div>

              <div className="space-y-3 mb-3.5">
                {o.items.map((it, i) => {
                  const variantLabel = [it.sleeveType, it.zipType, it.pantOption?.name, it.shawlOption?.name]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <div
                        className="w-11 h-11 overflow-hidden shrink-0 relative"
                        style={{ background: GOLD_LIGHT, border: `1px solid ${LINE}`, borderRadius: '3px' }}
                      >
                        {it.image && <Image src={it.image} alt={it.name} fill className="object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: BLACK }}>{it.name}</p>
                        <p className="text-xs" style={{ color: GREY }}>
                          Qty {it.qty}{variantLabel ? ` · ${variantLabel}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-sm pt-3.5" style={{ borderTop: `1px solid ${LINE}` }}>
                <span style={{ color: GREY }}>
                  {o.items.length} item{o.items.length > 1 ? 's' : ''}
                </span>
                <span className="font-medium" style={{ color: GOLD_DEEP }}>{formatINR(o.total)}</span>
              </div>

              {o.courier?.trackingId && (
                <div className="flex items-center gap-1.5 text-[11px] mt-2" style={{ color: GREY }}>
                  <Truck size={11} strokeWidth={1.5} style={{ color: GOLD_DEEP }} />
                  {o.courier.partner} · {o.courier.trackingId}
                </div>
              )}

              <p className="text-[11px] mt-1.5" style={{ color: GREY }}>
                {new Date(o.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}