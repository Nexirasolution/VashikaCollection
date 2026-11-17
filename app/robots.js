export default function robots() {
  const siteUrl ='https://www.vashikacollection.com';
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }
    ],
    sitemap: `${siteUrl}/sitemap.xml`
  };
}