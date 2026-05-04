const { asyncHandler } = require('../utils/asyncHandler');
const Product = require('../models/Product');

const generateSitemap = asyncHandler(async (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || 'https://yourdomain.com';
    
    // Get all public products
    const products = await Product.find({ status: 'public' })
      .select('slug updatedAt')
      .lean();
    
    // Get unique categories
    const categories = await Product.distinct('category', { status: 'public' });
    
    const urls = [];
    
    // Static pages
    urls.push({
      loc: baseUrl,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: '1.0'
    });
    
    urls.push({
      loc: `${baseUrl}/products`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.8'
    });
    
    urls.push({
      loc: `${baseUrl}/about`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.6'
    });
    
    urls.push({
      loc: `${baseUrl}/contact`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.6'
    });
    
    // Category pages
    categories.forEach(category => {
      const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
      urls.push({
        loc: `${baseUrl}/category/${categorySlug}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.7'
      });
    });
    
    // Product pages
    products.forEach(product => {
      urls.push({
        loc: `${baseUrl}/product/${product.slug}`,
        lastmod: product.updatedAt.toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.9'
      });
    });
    
    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
    
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    return res.status(200).send(xml);
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

module.exports = { generateSitemap };
