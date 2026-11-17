// cloudflare-image-loader.js
export default function cloudflareLoader({ src, width, quality }) {
  if (process.env.NODE_ENV === 'development') return src;
  const params = `width=${width},quality=${quality || 75},format=auto`;
  // src is a full R2 URL like https://img.yourdomain.com/products/a.jpg
  const path = src.replace(/^https?:\/\/[^/]+\//, '');
  return `https://img.yourdomain.com/cdn-cgi/image/${params}/${path}`;
}