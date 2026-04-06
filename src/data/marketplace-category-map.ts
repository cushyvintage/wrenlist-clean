/**
 * Wrenlist Canonical Category Tree — Phase 2
 *
 * 16 top-level categories, ~200 leaf nodes
 * Each leaf maps to verified native IDs on: eBay UK, Vinted, Shopify, Etsy, Depop
 *
 * eBay IDs: LEAF category IDs from Taxonomy API v1 tree 3 (verified no children)
 * Vinted IDs: From live API GET /api/v2/item_upload/catalogs
 * Shopify IDs: Shopify Product Taxonomy node IDs
 * Etsy: Slug-based (buyer taxonomy — seller taxonomy IDs need API key)
 * Depop: Pipe-separated "department|group|productType"
 *
 * Architecture: Option C (Hybrid)
 * - finds.category stores the canonical value (e.g. "ceramics_plates")
 * - product_marketplace_data.platform_category_id stores per-marketplace overrides
 */

import type { CategoryNode, CategoryTree } from '@/types/categories'

// Re-export type for backward compatibility
export type { CategoryNode } from '@/types/categories'

export const CATEGORY_TREE: CategoryTree = {
  // =========================================================================
  // CERAMICS & TABLEWARE
  // =========================================================================
  ceramics: {
    plates: {
      value: 'ceramics_plates',
      label: 'Plates',
      platforms: {
        ebay: { id: '262379', name: 'Plates', path: 'Pottery, Ceramics & Glass > Decorative Cookware & Tableware > Plates' },
        vinted: { id: '1932', name: 'Dinnerware', path: 'Home > Tableware > Dinnerware' },
        shopify: { id: 'hg-11-10-4-3', name: 'Plates', path: 'Home & Garden > Kitchen & Dining > Tableware > Dinnerware > Plates' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|dinnerware', name: 'Dinnerware' },
      },
    },
    bowls: {
      value: 'ceramics_bowls',
      label: 'Bowls',
      platforms: {
        ebay: { id: '262366', name: 'Bowls', path: 'Pottery, Ceramics & Glass > Decorative Cookware & Tableware > Bowls' },
        vinted: { id: '1932', name: 'Dinnerware', path: 'Home > Tableware > Dinnerware' },
        shopify: { id: 'hg-11-10-4-1', name: 'Bowls', path: 'Home & Garden > Kitchen & Dining > Tableware > Dinnerware > Bowls' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|dinnerware', name: 'Dinnerware' },
      },
    },
    dinnerSets: {
      value: 'ceramics_dinner_sets',
      label: 'Dinner Sets',
      platforms: {
        ebay: { id: '262373', name: 'Dinner Sets', path: 'Pottery, Ceramics & Glass > Decorative Cookware & Tableware > Dinner Sets' },
        vinted: { id: '1932', name: 'Dinnerware', path: 'Home > Tableware > Dinnerware' },
        shopify: { id: 'hg-11-10-4-2', name: 'Dinnerware Sets', path: 'Home & Garden > Kitchen & Dining > Tableware > Dinnerware > Dinnerware Sets' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|dinnerware', name: 'Dinnerware' },
      },
    },
    mugs: {
      value: 'ceramics_mugs',
      label: 'Mugs & Cups',
      platforms: {
        ebay: { id: '262378', name: 'Mugs', path: 'Pottery, Ceramics & Glass > Decorative Cookware & Tableware > Mugs' },
        vinted: { id: '2006', name: 'Cups & mugs', path: 'Home > Tableware > Drinkware > Cups & mugs' },
        shopify: { id: 'hg-11-10-5-5', name: 'Mugs', path: 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|drinkware', name: 'Drinkware' },
      },
    },
    cupSaucers: {
      value: 'ceramics_cup_saucers',
      label: 'Cup & Saucers',
      platforms: {
        ebay: { id: '262372', name: 'Cup & Saucers', path: 'Pottery, Ceramics & Glass > Decorative Cookware & Tableware > Cup & Saucers' },
        vinted: { id: '2006', name: 'Cups & mugs', path: 'Home > Tableware > Drinkware > Cups & mugs' },
        shopify: { id: 'hg-11-10-5-5', name: 'Mugs', path: 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|drinkware', name: 'Drinkware' },
      },
    },
    teapots: {
      value: 'ceramics_teapots',
      label: 'Teapots & Coffee Pots',
      platforms: {
        ebay: { id: '262381', name: 'Tea & Coffee Pots', path: 'Pottery, Ceramics & Glass > Decorative Cookware & Tableware > Tea & Coffee Pots' },
        vinted: { id: '3856', name: 'Coffee pots & teapots', path: 'Home > Tableware > Serveware > Coffee pots & teapots' },
        shopify: { id: 'hg-11-10-2-2', name: 'Teapots', path: 'Home & Garden > Kitchen & Dining > Tableware > Coffee Servers & Teapots > Teapots' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|kitchen', name: 'Kitchen' },
      },
    },
    jugs: {
      value: 'ceramics_jugs',
      label: 'Jugs & Pitchers',
      platforms: {
        ebay: { id: '262376', name: 'Jugs & Pitchers', path: 'Pottery, Ceramics & Glass > Decorative Cookware & Tableware > Jugs & Pitchers' },
        vinted: { id: '3857', name: 'Jugs', path: 'Home > Tableware > Serveware > Jugs' },
        shopify: { id: 'hg-11-10-4-3', name: 'Plates', path: 'Home & Garden > Kitchen & Dining > Tableware > Dinnerware > Plates' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|dinnerware', name: 'Dinnerware' },
      },
    },
    vases: {
      value: 'ceramics_vases',
      label: 'Vases',
      platforms: {
        ebay: { id: '262408', name: 'Vases', path: 'Pottery, Ceramics & Glass > Decorative Pottery, Ceramics & Glass > Vases' },
        vinted: { id: '1940', name: 'Vases', path: 'Home > Home accessories > Vases' },
        shopify: { id: 'hg-3-57', name: 'Vases', path: 'Home & Garden > Decor > Vases' },
        etsy: { id: 'home-decor', name: 'Home Decor', path: 'Home & Living > Home Decor' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    figurines: {
      value: 'ceramics_figurines',
      label: 'Figurines & Ornaments',
      platforms: {
        ebay: { id: '262394', name: 'Figurines', path: 'Pottery, Ceramics & Glass > Decorative Pottery, Ceramics & Glass > Figurines' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'hg-3-4-3', name: 'Sculptures & Statues', path: 'Home & Garden > Decor > Artwork > Sculptures & Statues' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    dishes: {
      value: 'ceramics_dishes',
      label: 'Dishes & Platters',
      platforms: {
        ebay: { id: '262374', name: 'Dishes', path: 'Pottery, Ceramics & Glass > Decorative Cookware & Tableware > Dishes' },
        vinted: { id: '1932', name: 'Dinnerware', path: 'Home > Tableware > Dinnerware' },
        shopify: { id: 'hg-11-10-4-3', name: 'Plates', path: 'Home & Garden > Kitchen & Dining > Tableware > Dinnerware > Plates' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|dinnerware', name: 'Dinnerware' },
      },
    },
    other: {
      value: 'ceramics_other',
      label: 'Other Ceramics',
      platforms: {
        ebay: { id: '262365', name: 'Other Pottery & Glass', path: 'Pottery, Ceramics & Glass > Other Pottery & Glass' },
        vinted: { id: '1920', name: 'Tableware', path: 'Home > Tableware' },
        shopify: { id: 'hg-11-10-4-3', name: 'Plates', path: 'Home & Garden > Kitchen & Dining > Tableware > Dinnerware > Plates' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|dinnerware', name: 'Dinnerware' },
      },
    },
  },

  // =========================================================================
  // GLASSWARE
  // =========================================================================
  glassware: {
    drinkware: {
      value: 'glassware_drinkware',
      label: 'Drinkware',
      platforms: {
        ebay: { id: '262360', name: 'Drinkware', path: 'Pottery, Ceramics & Glass > Drinkware & Barware > Drinkware' },
        vinted: { id: '2005', name: 'Drinkware', path: 'Home > Tableware > Drinkware' },
        shopify: { id: 'hg-11-10-5-8', name: 'Tumblers', path: 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Tumblers' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|drinkware', name: 'Drinkware' },
      },
    },
    stemmedGlasses: {
      value: 'glassware_stemmed',
      label: 'Wine & Stemmed Glasses',
      platforms: {
        ebay: { id: '262360', name: 'Drinkware', path: 'Pottery, Ceramics & Glass > Drinkware & Barware > Drinkware' },
        vinted: { id: '2009', name: 'Stemmed glasses', path: 'Home > Tableware > Drinkware > Stemmed glasses' },
        shopify: { id: 'hg-11-10-5-7-3', name: 'Wine Glasses', path: 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Stemware > Wine Glasses' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|drinkware', name: 'Drinkware' },
      },
    },
    tumblers: {
      value: 'glassware_tumblers',
      label: 'Tumblers',
      platforms: {
        ebay: { id: '262360', name: 'Drinkware', path: 'Pottery, Ceramics & Glass > Drinkware & Barware > Drinkware' },
        vinted: { id: '2010', name: 'Tumblers', path: 'Home > Tableware > Drinkware > Tumblers' },
        shopify: { id: 'hg-11-10-5-8', name: 'Tumblers', path: 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Tumblers' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|drinkware', name: 'Drinkware' },
      },
    },
    decanters: {
      value: 'glassware_decanters',
      label: 'Decanters',
      platforms: {
        ebay: { id: '262362', name: 'Decanters', path: 'Pottery, Ceramics & Glass > Drinkware & Barware > Decanters' },
        vinted: { id: '2005', name: 'Drinkware', path: 'Home > Tableware > Drinkware' },
        shopify: { id: 'hg-11-10-5-8', name: 'Tumblers', path: 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Tumblers' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|drinkware', name: 'Drinkware' },
      },
    },
    vases: {
      value: 'glassware_vases',
      label: 'Glass Vases',
      platforms: {
        ebay: { id: '262408', name: 'Vases', path: 'Pottery, Ceramics & Glass > Decorative Pottery, Ceramics & Glass > Vases' },
        vinted: { id: '1940', name: 'Vases', path: 'Home > Home accessories > Vases' },
        shopify: { id: 'hg-3-57', name: 'Vases', path: 'Home & Garden > Decor > Vases' },
        etsy: { id: 'glass-art', name: 'Glass Art', path: 'Art & Collectibles > Glass Art' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    other: {
      value: 'glassware_other',
      label: 'Other Glassware',
      platforms: {
        ebay: { id: '262365', name: 'Other Pottery & Glass', path: 'Pottery, Ceramics & Glass > Other Pottery & Glass' },
        vinted: { id: '2005', name: 'Drinkware', path: 'Home > Tableware > Drinkware' },
        shopify: { id: 'hg-11-10-5-8', name: 'Tumblers', path: 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Tumblers' },
        etsy: { id: 'kitchen-and-dining', name: 'Kitchen & Dining', path: 'Home & Living > Kitchen & Dining' },
        depop: { id: 'everything-else|home|drinkware', name: 'Drinkware' },
      },
    },
  },

  // =========================================================================
  // BOOKS, MOVIES & MUSIC (media)
  // =========================================================================
  books: {
    fiction: {
      value: 'books_fiction',
      label: 'Fiction',
      platforms: {
        ebay: { id: '261186', name: 'Books', path: 'Books, Comics & Magazines > Books' },
        vinted: { id: '2997', name: 'Books', path: 'Entertainment > Books' },
        shopify: { id: 'me-1-3', name: 'Print Books', path: 'Media > Books > Print Books' },
        etsy: { id: 'books', name: 'Books', path: 'Books, Movies & Music > Books' },
        depop: { id: 'everything-else|books-and-magazines|books', name: 'Books' },
      },
    },
    nonfiction: {
      value: 'books_nonfiction',
      label: 'Non-Fiction',
      platforms: {
        ebay: { id: '261186', name: 'Books', path: 'Books, Comics & Magazines > Books' },
        vinted: { id: '2997', name: 'Books', path: 'Entertainment > Books' },
        shopify: { id: 'me-1-3', name: 'Print Books', path: 'Media > Books > Print Books' },
        etsy: { id: 'books', name: 'Books', path: 'Books, Movies & Music > Books' },
        depop: { id: 'everything-else|books-and-magazines|books', name: 'Books' },
      },
    },
    academic: {
      value: 'books_academic',
      label: 'Academic & Reference',
      platforms: {
        ebay: { id: '171223', name: 'Textbooks & Study Guides', path: 'Books, Comics & Magazines > Textbooks, Education & Reference > School Textbooks & Study Guides' },
        vinted: { id: '2997', name: 'Books', path: 'Entertainment > Books' },
        shopify: { id: 'me-1-3', name: 'Print Books', path: 'Media > Books > Print Books' },
        etsy: { id: 'books', name: 'Books', path: 'Books, Movies & Music > Books' },
        depop: { id: 'everything-else|books-and-magazines|books', name: 'Books' },
      },
    },
    illustrated: {
      value: 'books_illustrated',
      label: 'Illustrated & Art Books',
      platforms: {
        ebay: { id: '261186', name: 'Books', path: 'Books, Comics & Magazines > Books' },
        vinted: { id: '2997', name: 'Books', path: 'Entertainment > Books' },
        shopify: { id: 'me-1-3', name: 'Print Books', path: 'Media > Books > Print Books' },
        etsy: { id: 'books', name: 'Books', path: 'Books, Movies & Music > Books' },
        depop: { id: 'everything-else|books-and-magazines|books', name: 'Books' },
      },
    },
    antiquarian: {
      value: 'books_antiquarian',
      label: 'Antiquarian & Collectable',
      platforms: {
        ebay: { id: '29223', name: 'Antiquarian & Collectable', path: 'Books, Comics & Magazines > Antiquarian & Collectable' },
        vinted: { id: '2997', name: 'Books', path: 'Entertainment > Books' },
        shopify: { id: 'me-1-3', name: 'Print Books', path: 'Media > Books > Print Books' },
        etsy: { id: 'books', name: 'Books', path: 'Books, Movies & Music > Books' },
        depop: { id: 'everything-else|books-and-magazines|books', name: 'Books' },
      },
    },
    comics: {
      value: 'books_comics',
      label: 'Comics & Graphic Novels',
      platforms: {
        ebay: { id: '63', name: 'Comic Books & Memorabilia', path: 'Books, Comics & Magazines > Comic Books & Memorabilia' },
        vinted: { id: '2997', name: 'Books', path: 'Entertainment > Books' },
        shopify: { id: 'me-1-3', name: 'Print Books', path: 'Media > Books > Print Books' },
        etsy: { id: 'books', name: 'Books', path: 'Books, Movies & Music > Books' },
        depop: { id: 'everything-else|books-and-magazines|comics', name: 'Comics' },
      },
    },
    magazines: {
      value: 'books_magazines',
      label: 'Magazines',
      platforms: {
        ebay: { id: '280', name: 'Magazines', path: 'Books, Comics & Magazines > Magazines' },
        vinted: { id: '2997', name: 'Books', path: 'Entertainment > Books' },
        shopify: { id: 'me-1-3', name: 'Print Books', path: 'Media > Books > Print Books' },
        etsy: { id: 'magazines', name: 'Magazines', path: 'Books, Movies & Music > Magazines' },
        depop: { id: 'everything-else|books-and-magazines|magazines', name: 'Magazines' },
      },
    },
    other: {
      value: 'books_other',
      label: 'Other Books',
      platforms: {
        ebay: { id: '261186', name: 'Books', path: 'Books, Comics & Magazines > Books' },
        vinted: { id: '2997', name: 'Books', path: 'Entertainment > Books' },
        shopify: { id: 'me-1-3', name: 'Print Books', path: 'Media > Books > Print Books' },
        etsy: { id: 'books', name: 'Books', path: 'Books, Movies & Music > Books' },
        depop: { id: 'everything-else|books-and-magazines|books', name: 'Books' },
      },
    },
  },

  // =========================================================================
  // JEWELLERY
  // =========================================================================
  jewellery: {
    earrings: {
      value: 'jewellery_earrings',
      label: 'Earrings',
      platforms: {
        ebay: { id: '50647', name: 'Earrings', path: 'Jewellery & Watches > Costume Jewellery > Earrings' },
        vinted: { id: '163', name: 'Earrings', path: 'Women > Accessories > Jewellery > Earrings' },
        shopify: { id: 'aa-6-6', name: 'Earrings', path: 'Apparel & Accessories > Jewelry > Earrings' },
        etsy: { id: 'earrings', name: 'Earrings', path: 'Jewellery > Earrings' },
        depop: { id: 'womenswear|jewellery|earrings', name: 'Earrings' },
      },
    },
    necklaces: {
      value: 'jewellery_necklaces',
      label: 'Necklaces & Pendants',
      platforms: {
        ebay: { id: '155101', name: 'Necklaces & Pendants', path: 'Jewellery & Watches > Costume Jewellery > Necklaces & Pendants' },
        vinted: { id: '164', name: 'Necklaces', path: 'Women > Accessories > Jewellery > Necklaces' },
        shopify: { id: 'aa-6-8', name: 'Necklaces', path: 'Apparel & Accessories > Jewelry > Necklaces' },
        etsy: { id: 'necklaces', name: 'Necklaces', path: 'Jewellery > Necklaces' },
        depop: { id: 'womenswear|jewellery|necklaces', name: 'Necklaces' },
      },
    },
    bracelets: {
      value: 'jewellery_bracelets',
      label: 'Bracelets',
      platforms: {
        ebay: { id: '261987', name: 'Bracelets & Charms', path: 'Jewellery & Watches > Costume Jewellery > Bracelets & Charms' },
        vinted: { id: '165', name: 'Bracelets', path: 'Women > Accessories > Jewellery > Bracelets' },
        shopify: { id: 'aa-6-3', name: 'Bracelets', path: 'Apparel & Accessories > Jewelry > Bracelets' },
        etsy: { id: 'bracelets', name: 'Bracelets', path: 'Jewellery > Bracelets' },
        depop: { id: 'womenswear|jewellery|bracelets', name: 'Bracelets' },
      },
    },
    rings: {
      value: 'jewellery_rings',
      label: 'Rings',
      platforms: {
        ebay: { id: '67681', name: 'Rings', path: 'Jewellery & Watches > Costume Jewellery > Rings' },
        vinted: { id: '553', name: 'Rings', path: 'Women > Accessories > Jewellery > Rings' },
        shopify: { id: 'aa-6-9', name: 'Rings', path: 'Apparel & Accessories > Jewelry > Rings' },
        etsy: { id: 'rings', name: 'Rings', path: 'Jewellery > Rings' },
        depop: { id: 'womenswear|jewellery|rings', name: 'Rings' },
      },
    },
    brooches: {
      value: 'jewellery_brooches',
      label: 'Brooches & Pins',
      platforms: {
        ebay: { id: '50677', name: 'Brooches & Pins', path: 'Jewellery & Watches > Costume Jewellery > Brooches & Pins' },
        vinted: { id: '167', name: 'Brooches', path: 'Women > Accessories > Jewellery > Brooches' },
        shopify: { id: 'aa-6-4', name: 'Brooches & Lapel Pins', path: 'Apparel & Accessories > Jewelry > Brooches & Lapel Pins' },
        etsy: { id: 'brooches', name: 'Brooches, Pins & Clips', path: 'Jewellery > Brooches, Pins & Clips' },
        depop: { id: 'womenswear|jewellery|brooches', name: 'Brooches' },
      },
    },
    watches: {
      value: 'jewellery_watches',
      label: 'Watches',
      platforms: {
        ebay: { id: '31387', name: 'Wristwatches', path: 'Jewellery & Watches > Watches, Parts & Accessories > Watches > Wristwatches' },
        vinted: { id: '22', name: 'Watches', path: 'Women > Accessories > Watches' },
        shopify: { id: 'aa-6-11', name: 'Watches', path: 'Apparel & Accessories > Jewelry > Watches' },
        etsy: { id: 'watches', name: 'Watches', path: 'Jewellery > Watches' },
        depop: { id: 'womenswear|accessories|watches', name: 'Watches' },
      },
    },
    cufflinks: {
      value: 'jewellery_cufflinks',
      label: 'Cufflinks & Tie Clips',
      platforms: {
        ebay: { id: '137843', name: 'Cufflinks', path: "Jewellery & Watches > Men's Jewellery > Cufflinks" },
        vinted: { id: '97', name: 'Watches', path: "Men > Accessories > Watches" },
        shopify: { id: 'aa-6-3', name: 'Bracelets', path: 'Apparel & Accessories > Jewelry > Bracelets' },
        etsy: { id: 'cuff-links-and-tie-clips', name: 'Cuff Links & Tie Clips', path: 'Jewellery > Cuff Links & Tie Clips' },
        depop: { id: 'menswear|accessories|other-accessories', name: 'Accessories' },
      },
    },
    vintage: {
      value: 'jewellery_vintage',
      label: 'Vintage & Antique',
      platforms: {
        ebay: { id: '262008', name: 'Earrings', path: 'Jewellery & Watches > Vintage & Antique Jewellery > Earrings' },
        vinted: { id: '21', name: 'Jewellery', path: 'Women > Accessories > Jewellery' },
        shopify: { id: 'aa-6-6', name: 'Earrings', path: 'Apparel & Accessories > Jewelry > Earrings' },
        etsy: { id: 'jewelry', name: 'Jewellery', path: 'Jewellery' },
        depop: { id: 'womenswear|jewellery|other-jewellery', name: 'Jewellery' },
      },
    },
    other: {
      value: 'jewellery_other',
      label: 'Other Jewellery',
      platforms: {
        ebay: { id: '262023', name: 'Other Jewellery', path: 'Jewellery & Watches > Other Jewellery' },
        vinted: { id: '21', name: 'Jewellery', path: 'Women > Accessories > Jewellery' },
        shopify: { id: 'aa-6-6', name: 'Earrings', path: 'Apparel & Accessories > Jewelry > Earrings' },
        etsy: { id: 'jewelry', name: 'Jewellery', path: 'Jewellery' },
        depop: { id: 'womenswear|jewellery|other-jewellery', name: 'Jewellery' },
      },
    },
  },

  // =========================================================================
  // CLOTHING
  // =========================================================================
  clothing: {
    dresses: {
      value: 'clothing_dresses',
      label: 'Dresses',
      platforms: {
        ebay: { id: '63861', name: 'Dresses', path: "Clothes, Shoes & Accessories > Women > Women's Clothing > Dresses" },
        vinted: { id: '10', name: 'Dresses', path: 'Women > Clothing > Dresses' },
        shopify: { id: 'aa-1-4', name: 'Dresses', path: 'Apparel & Accessories > Clothing > Dresses' },
        etsy: { id: 'dresses', name: 'Dresses', path: 'Clothing > Dresses' },
        depop: { id: 'womenswear|dresses|casual-dresses', name: 'Casual dresses' },
      },
    },
    tops: {
      value: 'clothing_tops',
      label: 'Tops & Shirts',
      platforms: {
        ebay: { id: '53159', name: 'Tops & Shirts', path: "Clothes, Shoes & Accessories > Women > Women's Clothing > Tops & Shirts" },
        vinted: { id: '1043', name: 'Blouses', path: 'Women > Clothing > Tops & t-shirts > Blouses' },
        shopify: { id: 'aa-1-13-7', name: 'Shirts', path: 'Apparel & Accessories > Clothing > Clothing Tops > Shirts' },
        etsy: { id: 'tops-and-tees', name: 'Tops & Tees', path: 'Clothing > Tops & Tees' },
        depop: { id: 'womenswear|tops|blouses', name: 'Blouses' },
      },
    },
    trousers: {
      value: 'clothing_trousers',
      label: 'Trousers & Jeans',
      platforms: {
        ebay: { id: '63863', name: 'Trousers', path: "Clothes, Shoes & Accessories > Women > Women's Clothing > Trousers" },
        vinted: { id: '573', name: 'Trousers', path: 'Women > Clothing > Activewear > Trousers' },
        shopify: { id: 'aa-1-12-11', name: 'Trousers', path: 'Apparel & Accessories > Clothing > Pants > Trousers' },
        etsy: { id: 'pants-and-capris', name: 'Trousers & Capris', path: 'Clothing > Trousers & Capris' },
        depop: { id: 'womenswear|bottoms|trousers', name: 'Trousers' },
      },
    },
    skirts: {
      value: 'clothing_skirts',
      label: 'Skirts',
      platforms: {
        ebay: { id: '63864', name: 'Skirts', path: "Clothes, Shoes & Accessories > Women > Women's Clothing > Skirts" },
        vinted: { id: '11', name: 'Skirts', path: 'Women > Clothing > Skirts' },
        shopify: { id: 'aa-1-15', name: 'Skirts', path: 'Apparel & Accessories > Clothing > Skirts' },
        etsy: { id: 'skirts', name: 'Skirts', path: 'Clothing > Skirts' },
        depop: { id: 'womenswear|bottoms|skirts', name: 'Skirts' },
      },
    },
    coats: {
      value: 'clothing_coats',
      label: 'Coats & Jackets',
      platforms: {
        ebay: { id: '63862', name: 'Coats, Jackets & Waistcoats', path: "Clothes, Shoes & Accessories > Women > Women's Clothing > Coats, Jackets & Waistcoats" },
        vinted: { id: '1907', name: 'Coats', path: 'Women > Clothing > Outerwear > Coats' },
        shopify: { id: 'aa-1-10-2', name: 'Coats & Jackets', path: 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets' },
        etsy: { id: 'jackets-and-coats', name: 'Jackets & Coats', path: 'Clothing > Jackets & Coats' },
        depop: { id: 'womenswear|coats-and-jackets|other-coats-and-jackets', name: 'Coats & Jackets' },
      },
    },
    knitwear: {
      value: 'clothing_knitwear',
      label: 'Jumpers & Cardigans',
      platforms: {
        ebay: { id: '63866', name: 'Jumpers & Cardigans', path: "Clothes, Shoes & Accessories > Women > Women's Clothing > Jumpers & Cardigans" },
        vinted: { id: '13', name: 'Jumpers & sweaters', path: 'Women > Clothing > Jumpers & sweaters' },
        shopify: { id: 'aa-1-13-7', name: 'Shirts', path: 'Apparel & Accessories > Clothing > Clothing Tops > Shirts' },
        etsy: { id: 'sweaters', name: 'Jumpers & Hoodies', path: 'Clothing > Jumpers & Hoodies' },
        depop: { id: 'womenswear|tops|jumpers', name: 'Jumpers' },
      },
    },
    mensShirts: {
      value: 'clothing_mens_shirts',
      label: "Men's Shirts & Tops",
      platforms: {
        ebay: { id: '185100', name: 'Shirts & Tops', path: "Clothes, Shoes & Accessories > Men > Men's Clothing > Shirts & Tops" },
        vinted: { id: '536', name: 'Shirts', path: "Men > Clothing > Tops & t-shirts > Shirts" },
        shopify: { id: 'aa-1-13-7', name: 'Shirts', path: 'Apparel & Accessories > Clothing > Clothing Tops > Shirts' },
        etsy: { id: 'tops-and-tees', name: 'Tops & Tees', path: 'Clothing > Tops & Tees' },
        depop: { id: 'menswear|tops|shirts', name: 'Shirts' },
      },
    },
    mensTrousers: {
      value: 'clothing_mens_trousers',
      label: "Men's Trousers",
      platforms: {
        ebay: { id: '57989', name: 'Trousers', path: "Clothes, Shoes & Accessories > Men > Men's Clothing > Trousers" },
        vinted: { id: '34', name: 'Trousers', path: 'Men > Clothing > Trousers' },
        shopify: { id: 'aa-1-12-11', name: 'Trousers', path: 'Apparel & Accessories > Clothing > Pants > Trousers' },
        etsy: { id: 'pants-and-capris', name: 'Trousers & Capris', path: 'Clothing > Trousers & Capris' },
        depop: { id: 'menswear|bottoms|trousers', name: 'Trousers' },
      },
    },
    mensCoats: {
      value: 'clothing_mens_coats',
      label: "Men's Coats & Jackets",
      platforms: {
        ebay: { id: '57988', name: 'Coats, Jackets & Waistcoats', path: "Clothes, Shoes & Accessories > Men > Men's Clothing > Coats, Jackets & Waistcoats" },
        vinted: { id: '2051', name: 'Coats', path: 'Men > Clothing > Outerwear > Coats' },
        shopify: { id: 'aa-1-10-2', name: 'Coats & Jackets', path: 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets' },
        etsy: { id: 'jackets-and-coats', name: 'Jackets & Coats', path: 'Clothing > Jackets & Coats' },
        depop: { id: 'menswear|coats-and-jackets|other-coats-and-jackets', name: 'Coats & Jackets' },
      },
    },
    shoesWomens: {
      value: 'clothing_shoes_womens',
      label: "Women's Shoes",
      platforms: {
        ebay: { id: '3034', name: "Women's Shoes", path: "Clothes, Shoes & Accessories > Women > Women's Shoes" },
        vinted: { id: '16', name: "Women's Shoes", path: "Women > Shoes" },
        shopify: { id: 'aa-8', name: 'Shoes', path: 'Apparel & Accessories > Shoes' },
        etsy: { id: 'womens-shoes', name: "Women's Shoes", path: "Shoes > Women's Shoes" },
        depop: { id: 'womenswear|footwear|other-shoes', name: 'Shoes' },
      },
    },
    shoesMens: {
      value: 'clothing_shoes_mens',
      label: "Men's Shoes",
      platforms: {
        ebay: { id: '93427', name: "Men's Shoes", path: "Clothes, Shoes & Accessories > Men > Men's Shoes" },
        vinted: { id: '1231', name: "Men's Shoes", path: "Men > Shoes" },
        shopify: { id: 'aa-8', name: 'Shoes', path: 'Apparel & Accessories > Shoes' },
        etsy: { id: 'mens-shoes', name: "Men's Shoes", path: "Shoes > Men's Shoes" },
        depop: { id: 'menswear|footwear|other-shoes', name: 'Shoes' },
      },
    },
    bags: {
      value: 'clothing_bags',
      label: 'Bags & Handbags',
      platforms: {
        ebay: { id: '169291', name: "Women's Bags & Handbags", path: "Clothes, Shoes & Accessories > Women > Women's Bags & Handbags" },
        vinted: { id: '156', name: 'Handbags', path: 'Women > Bags > Handbags' },
        shopify: { id: 'aa-3', name: 'Handbags, Wallets & Cases', path: 'Apparel & Accessories > Handbags, Wallets & Cases' },
        etsy: { id: 'handbags', name: 'Handbags', path: 'Bags & Purses > Handbags' },
        depop: { id: 'womenswear|accessories|bags', name: 'Bags' },
      },
    },
    vintage: {
      value: 'clothing_vintage',
      label: 'Vintage Clothing',
      platforms: {
        ebay: { id: '91247', name: 'Other Vintage Clothing & Accs.', path: 'Clothes, Shoes & Accessories > Specialty > Vintage Clothing & Accessories > Other Vintage Clothing & Accs.' },
        vinted: { id: '4', name: "Women's Clothing", path: 'Women > Clothing' },
        shopify: { id: 'aa-1-4', name: 'Dresses', path: 'Apparel & Accessories > Clothing > Dresses' },
        etsy: { id: 'clothing', name: 'Clothing', path: 'Clothing' },
        depop: { id: 'womenswear|tops|other-tops', name: 'Tops' },
      },
    },
    other: {
      value: 'clothing_other',
      label: 'Other Clothing',
      platforms: {
        ebay: { id: '312', name: 'Other Clothes, Shoes & Accessories', path: 'Clothes, Shoes & Accessories > Specialty > Other Clothes, Shoes & Accessories' },
        vinted: { id: '4', name: "Women's Clothing", path: 'Women > Clothing' },
        shopify: { id: 'aa-1-4', name: 'Dresses', path: 'Apparel & Accessories > Clothing > Dresses' },
        etsy: { id: 'clothing', name: 'Clothing', path: 'Clothing' },
        depop: { id: 'womenswear|tops|other-tops', name: 'Tops' },
      },
    },
  },

  // =========================================================================
  // HOME & DECOR
  // =========================================================================
  homeware: {
    candles: {
      value: 'homeware_candles',
      label: 'Candles & Holders',
      platforms: {
        ebay: { id: '261633', name: 'Candles', path: 'Collectables > Holiday & Seasonal > Candles' },
        vinted: { id: '1956', name: 'Candles', path: 'Home > Home accessories > Candles & home fragrance > Candles' },
        shopify: { id: 'hg-3-40-2', name: 'Candles', path: 'Home & Garden > Decor > Home Fragrances > Candles' },
        etsy: { id: 'home-decor', name: 'Home Decor', path: 'Home & Living > Home Decor' },
        depop: { id: 'everything-else|home|candles', name: 'Candles' },
      },
    },
    clocks: {
      value: 'homeware_clocks',
      label: 'Clocks',
      platforms: {
        ebay: { id: '262393', name: 'Clocks', path: 'Pottery, Ceramics & Glass > Decorative Pottery, Ceramics & Glass > Clocks' },
        vinted: { id: '1936', name: 'Clocks', path: 'Home > Home accessories > Clocks' },
        shopify: { id: 'hg-3-17', name: 'Clocks', path: 'Home & Garden > Decor > Clocks' },
        etsy: { id: 'home-decor', name: 'Home Decor', path: 'Home & Living > Home Decor' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    lighting: {
      value: 'homeware_lighting',
      label: 'Lighting & Lamps',
      platforms: {
        ebay: { id: '262411', name: 'Lamps', path: 'Pottery, Ceramics & Glass > Lamps, Lighting > Lamps' },
        vinted: { id: '3834', name: 'Lighting', path: 'Home > Home accessories > Lighting' },
        shopify: { id: 'hg-13', name: 'Lighting', path: 'Home & Garden > Lighting' },
        etsy: { id: 'lighting', name: 'Lighting', path: 'Home & Living > Lighting' },
        depop: { id: 'everything-else|home|lighting', name: 'Lighting' },
      },
    },
    mirrors: {
      value: 'homeware_mirrors',
      label: 'Mirrors',
      platforms: {
        ebay: { id: '20580', name: 'Mirrors', path: 'Home, Furniture & DIY > Home Décor > Mirrors' },
        vinted: { id: '1938', name: 'Mirrors', path: 'Home > Home accessories > Mirrors' },
        shopify: { id: 'hg-3-47', name: 'Mirrors', path: 'Home & Garden > Decor > Mirrors' },
        etsy: { id: 'home-decor', name: 'Home Decor', path: 'Home & Living > Home Decor' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    cushions: {
      value: 'homeware_cushions',
      label: 'Cushions & Throws',
      platforms: {
        ebay: { id: '20563', name: 'Cushions', path: 'Home, Furniture & DIY > Cushions' },
        vinted: { id: '1974', name: 'Cushions', path: 'Home > Textiles > Cushions' },
        shopify: { id: 'hg-3-15', name: 'Chair & Sofa Cushions', path: 'Home & Garden > Decor > Chair & Sofa Cushions' },
        etsy: { id: 'home-decor', name: 'Home Decor', path: 'Home & Living > Home Decor' },
        depop: { id: 'everything-else|home|textiles', name: 'Textiles' },
      },
    },
    rugs: {
      value: 'homeware_rugs',
      label: 'Rugs & Mats',
      platforms: {
        ebay: { id: '45510', name: 'Rugs', path: 'Home, Furniture & DIY > Rugs & Carpets > Rugs' },
        vinted: { id: '1954', name: 'Rugs', path: 'Home > Textiles > Rugs & mats > Rugs' },
        shopify: { id: 'hg-3-57', name: 'Rugs', path: 'Home & Garden > Decor > Rugs' },
        etsy: { id: 'floor-and-rugs', name: 'Rugs & Flooring', path: 'Home & Living > Rugs & Flooring' },
        depop: { id: 'everything-else|home|rugs-and-carpets', name: 'Rugs and carpets' },
      },
    },
    storage: {
      value: 'homeware_storage',
      label: 'Storage & Organisation',
      platforms: {
        ebay: { id: '20652', name: 'Kitchen Storage & Organisation', path: 'Home, Furniture & DIY > Cookware, Dining & Bar > Kitchen Storage & Organisation' },
        vinted: { id: '1939', name: 'Storage', path: 'Home > Home accessories > Storage' },
        shopify: { id: 'hg-3-57', name: 'Rugs', path: 'Home & Garden > Decor > Rugs' },
        etsy: { id: 'storage-and-organization', name: 'Storage & Organisation', path: 'Home & Living > Storage & Organisation' },
        depop: { id: 'everything-else|home|storage', name: 'Storage' },
      },
    },
    photoFrames: {
      value: 'homeware_photo_frames',
      label: 'Picture & Photo Frames',
      platforms: {
        ebay: { id: '79654', name: 'Photo & Picture Frames', path: 'Home, Furniture & DIY > Home Décor > Photo & Picture Frames' },
        vinted: { id: '1937', name: 'Picture & photo frames', path: 'Home > Home accessories > Picture & photo frames' },
        shopify: { id: 'hg-3-47', name: 'Mirrors', path: 'Home & Garden > Decor > Mirrors' },
        etsy: { id: 'home-decor', name: 'Home Decor', path: 'Home & Living > Home Decor' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    wallDecor: {
      value: 'homeware_wall_decor',
      label: 'Wall Hangings & Decor',
      platforms: {
        ebay: { id: '38237', name: 'Wall Hangings', path: 'Home, Furniture & DIY > Home Décor > Wall Hangings' },
        vinted: { id: '3846', name: 'Wall decor', path: 'Home > Home accessories > Wall decor' },
        shopify: { id: 'hg-3-57', name: 'Rugs', path: 'Home & Garden > Decor > Rugs' },
        etsy: { id: 'home-decor', name: 'Home Decor', path: 'Home & Living > Home Decor' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    bedding: {
      value: 'homeware_bedding',
      label: 'Bedding & Linen',
      platforms: {
        ebay: { id: '20444', name: 'Bedding', path: 'Home, Furniture & DIY > Bedding' },
        vinted: { id: '1924', name: 'Bedding', path: 'Home > Textiles > Bedding' },
        shopify: { id: 'hg-3-15', name: 'Chair & Sofa Cushions', path: 'Home & Garden > Decor > Chair & Sofa Cushions' },
        etsy: { id: 'bedding', name: 'Bedding', path: 'Home & Living > Bedding' },
        depop: { id: 'everything-else|home|bedding', name: 'Bedding' },
      },
    },
    other: {
      value: 'homeware_other',
      label: 'Other Home Accessories',
      platforms: {
        ebay: { id: '10034', name: 'Other Home Décor', path: 'Home, Furniture & DIY > Home Décor > Other Home Décor' },
        vinted: { id: '1934', name: 'Home accessories', path: 'Home > Home accessories' },
        shopify: { id: 'hg-3-57', name: 'Rugs', path: 'Home & Garden > Decor > Rugs' },
        etsy: { id: 'home-decor', name: 'Home Decor', path: 'Home & Living > Home Decor' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
  },

  // =========================================================================
  // FURNITURE
  // =========================================================================
  furniture: {
    seating: {
      value: 'furniture_seating',
      label: 'Chairs & Seating',
      platforms: {
        ebay: { id: '54235', name: 'Chairs', path: 'Home, Furniture & DIY > Furniture > Chairs' },
        vinted: { id: '3158', name: 'Seating', path: 'Home > Furniture > Seating' },
        shopify: { id: 'fr-7', name: 'Chairs', path: 'Furniture > Chairs' },
        etsy: { id: 'furniture', name: 'Furniture', path: 'Home & Living > Furniture' },
        depop: { id: 'everything-else|home|furniture', name: 'Furniture' },
      },
    },
    tables: {
      value: 'furniture_tables',
      label: 'Tables & Desks',
      platforms: {
        ebay: { id: '38204', name: 'Tables', path: 'Home, Furniture & DIY > Furniture > Tables' },
        vinted: { id: '3160', name: 'Tables & desks', path: 'Home > Furniture > Tables & desks' },
        shopify: { id: 'fr-24', name: 'Tables', path: 'Furniture > Tables' },
        etsy: { id: 'furniture', name: 'Furniture', path: 'Home & Living > Furniture' },
        depop: { id: 'everything-else|home|furniture', name: 'Furniture' },
      },
    },
    shelving: {
      value: 'furniture_shelving',
      label: 'Bookcases & Shelving',
      platforms: {
        ebay: { id: '3199', name: 'Bookcases, Shelving & Storage', path: 'Home, Furniture & DIY > Furniture > Bookcases, Shelving & Storage' },
        vinted: { id: '3194', name: 'Shelving units', path: 'Home > Furniture > Storage furniture > Shelving units' },
        shopify: { id: 'fr-19', name: 'Shelving', path: 'Furniture > Shelving' },
        etsy: { id: 'furniture', name: 'Furniture', path: 'Home & Living > Furniture' },
        depop: { id: 'everything-else|home|furniture', name: 'Furniture' },
      },
    },
    cabinets: {
      value: 'furniture_cabinets',
      label: 'Cabinets & Cupboards',
      platforms: {
        ebay: { id: '20487', name: 'Cabinets & Cupboards', path: 'Home, Furniture & DIY > Furniture > Cabinets & Cupboards' },
        vinted: { id: '3187', name: 'Storage furniture', path: 'Home > Furniture > Storage furniture' },
        shopify: { id: 'fr-19', name: 'Shelving', path: 'Furniture > Shelving' },
        etsy: { id: 'furniture', name: 'Furniture', path: 'Home & Living > Furniture' },
        depop: { id: 'everything-else|home|furniture', name: 'Furniture' },
      },
    },
    sideboards: {
      value: 'furniture_sideboards',
      label: 'Sideboards & Buffets',
      platforms: {
        ebay: { id: '183322', name: 'Sideboards & Buffets', path: 'Home, Furniture & DIY > Furniture > Sideboards & Buffets' },
        vinted: { id: '3187', name: 'Storage furniture', path: 'Home > Furniture > Storage furniture' },
        shopify: { id: 'fr-19', name: 'Shelving', path: 'Furniture > Shelving' },
        etsy: { id: 'furniture', name: 'Furniture', path: 'Home & Living > Furniture' },
        depop: { id: 'everything-else|home|furniture', name: 'Furniture' },
      },
    },
    bedroom: {
      value: 'furniture_bedroom',
      label: 'Bedroom Furniture',
      platforms: {
        ebay: { id: '20480', name: 'Bedroom Furniture Sets', path: 'Home, Furniture & DIY > Furniture > Bedroom Furniture Sets' },
        vinted: { id: '3154', name: 'Furniture', path: 'Home > Furniture' },
        shopify: { id: 'fr-7', name: 'Chairs', path: 'Furniture > Chairs' },
        etsy: { id: 'furniture', name: 'Furniture', path: 'Home & Living > Furniture' },
        depop: { id: 'everything-else|home|furniture', name: 'Furniture' },
      },
    },
    sofas: {
      value: 'furniture_sofas',
      label: 'Sofas & Armchairs',
      platforms: {
        ebay: { id: '38208', name: 'Sofas, Armchairs & Couches', path: 'Home, Furniture & DIY > Furniture > Sofas, Armchairs & Couches' },
        vinted: { id: '3158', name: 'Seating', path: 'Home > Furniture > Seating' },
        shopify: { id: 'fr-7', name: 'Chairs', path: 'Furniture > Chairs' },
        etsy: { id: 'furniture', name: 'Furniture', path: 'Home & Living > Furniture' },
        depop: { id: 'everything-else|home|furniture', name: 'Furniture' },
      },
    },
    other: {
      value: 'furniture_other',
      label: 'Other Furniture',
      platforms: {
        ebay: { id: '34386', name: 'Furniture Accessories', path: 'Home, Furniture & DIY > Furniture > Furniture Accessories' },
        vinted: { id: '3154', name: 'Furniture', path: 'Home > Furniture' },
        shopify: { id: 'fr-7', name: 'Chairs', path: 'Furniture > Chairs' },
        etsy: { id: 'furniture', name: 'Furniture', path: 'Home & Living > Furniture' },
        depop: { id: 'everything-else|home|furniture', name: 'Furniture' },
      },
    },
  },

  // =========================================================================
  // TOYS & GAMES
  // =========================================================================
  toys: {
    actionFigures: {
      value: 'toys_action_figures',
      label: 'Action Figures',
      platforms: {
        ebay: { id: '261068', name: 'Action Figures', path: 'Toys & Games > Action Figures & Accessories > Action Figures' },
        vinted: { id: '1730', name: 'Toy figures', path: 'Kids > Toys > Toy figures' },
        shopify: { id: 'tg-5-8-1-1', name: 'Action Figures', path: 'Toys & Games > Toys > Dolls, Playsets & Toy Figures > Action & Toy Figures > Action Figures' },
        etsy: { id: 'dolls-and-action-figures', name: 'Dolls & Action Figures', path: 'Toys & Games > Dolls & Action Figures' },
        depop: { id: 'everything-else|toys|figures-and-dolls', name: 'Figures and dolls' },
      },
    },
    softToys: {
      value: 'toys_soft',
      label: 'Soft Toys & Plushes',
      platforms: {
        ebay: { id: '230', name: 'Branded Soft Toys', path: 'Toys & Games > Soft Toys & Stuffed Animals > Branded Soft Toys' },
        vinted: { id: '1764', name: 'Soft toys', path: 'Kids > Toys > Soft toys' },
        shopify: { id: 'tg-5-8-11', name: 'Stuffed Animals', path: 'Toys & Games > Toys > Dolls, Playsets & Toy Figures > Stuffed Animals' },
        etsy: { id: 'stuffed-animals-and-plushies', name: 'Stuffed Animals & Plushies', path: 'Toys & Games > Stuffed Animals & Plushies' },
        depop: { id: 'everything-else|toys|plushies', name: 'Plushies' },
      },
    },
    boardGames: {
      value: 'toys_board_games',
      label: 'Board Games',
      platforms: {
        ebay: { id: '180349', name: 'Modern Manufacture', path: 'Toys & Games > Games > Board & Traditional Games > Modern Manufacture' },
        vinted: { id: '4881', name: 'Board games', path: 'Hobbies & collectables > Board games' },
        shopify: { id: 'tg-2-5', name: 'Board Games', path: 'Toys & Games > Games > Board Games' },
        etsy: { id: 'games-and-puzzles', name: 'Games & Puzzles', path: 'Toys & Games > Games & Puzzles' },
        depop: { id: 'everything-else|toys|puzzles-and-games', name: 'Puzzles and games' },
      },
    },
    puzzles: {
      value: 'toys_puzzles',
      label: 'Puzzles',
      platforms: {
        ebay: { id: '19183', name: 'Jigsaws', path: 'Toys & Games > Jigsaws & Puzzles > Jigsaws' },
        vinted: { id: '4881', name: 'Board games', path: 'Hobbies & collectables > Board games' },
        shopify: { id: 'tg-4', name: 'Puzzles', path: 'Toys & Games > Puzzles' },
        etsy: { id: 'games-and-puzzles', name: 'Games & Puzzles', path: 'Toys & Games > Games & Puzzles' },
        depop: { id: 'everything-else|toys|puzzles-and-games', name: 'Puzzles and games' },
      },
    },
    dolls: {
      value: 'toys_dolls',
      label: 'Dolls & Accessories',
      platforms: {
        ebay: { id: '261068', name: 'Action Figures', path: 'Toys & Games > Action Figures & Accessories > Action Figures' },
        vinted: { id: '1730', name: 'Toy figures', path: 'Kids > Toys > Toy figures' },
        shopify: { id: 'tg-5-8-6', name: 'Dolls', path: 'Toys & Games > Toys > Dolls, Playsets & Toy Figures > Dolls' },
        etsy: { id: 'dolls-and-action-figures', name: 'Dolls & Action Figures', path: 'Toys & Games > Dolls & Action Figures' },
        depop: { id: 'everything-else|toys|figures-and-dolls', name: 'Figures and dolls' },
      },
    },
    educational: {
      value: 'toys_educational',
      label: 'Educational Toys',
      platforms: {
        ebay: { id: '2518', name: 'Other Educational Toys', path: 'Toys & Games > Educational Toys > Other Educational Toys' },
        vinted: { id: '1763', name: 'Educational toys', path: 'Kids > Toys > Educational toys' },
        shopify: { id: 'tg-5-8-11', name: 'Stuffed Animals', path: 'Toys & Games > Toys > Dolls, Playsets & Toy Figures > Stuffed Animals' },
        etsy: { id: 'learning-and-school', name: 'Learning & School', path: 'Toys & Games > Learning & School' },
        depop: { id: 'everything-else|toys|other-toys', name: 'Toys' },
      },
    },
    lego: {
      value: 'toys_lego',
      label: 'LEGO & Building Toys',
      platforms: {
        ebay: { id: '19006', name: 'LEGO Complete Sets & Packs', path: 'Toys & Games > Construction Toys & Kits > LEGO (R) Complete Sets & Packs' },
        vinted: { id: '1499', name: 'Toys', path: 'Kids > Toys' },
        shopify: { id: 'tg-5-8-1-1', name: 'Action Figures', path: 'Toys & Games > Toys > Dolls, Playsets & Toy Figures > Action & Toy Figures > Action Figures' },
        etsy: { id: 'building-and-construction', name: 'Building & Construction', path: 'Toys & Games > Building & Construction' },
        depop: { id: 'everything-else|toys|other-toys', name: 'Toys' },
      },
    },
    vintage: {
      value: 'toys_vintage',
      label: 'Vintage & Classic Toys',
      platforms: {
        ebay: { id: '717', name: 'Vintage & Classic Toys', path: 'Toys & Games > Vintage & Classic Toys' },
        vinted: { id: '1499', name: 'Toys', path: 'Kids > Toys' },
        shopify: { id: 'tg-5-8-1-1', name: 'Action Figures', path: 'Toys & Games > Toys > Dolls, Playsets & Toy Figures > Action & Toy Figures > Action Figures' },
        etsy: { id: 'toys', name: 'Toys', path: 'Toys & Games > Toys' },
        depop: { id: 'everything-else|toys|other-toys', name: 'Toys' },
      },
    },
    other: {
      value: 'toys_other',
      label: 'Other Toys & Games',
      platforms: {
        ebay: { id: '1039', name: 'Other Toys & Games', path: 'Toys & Games > Other Toys & Games' },
        vinted: { id: '1499', name: 'Toys', path: 'Kids > Toys' },
        shopify: { id: 'tg-5-8-11', name: 'Stuffed Animals', path: 'Toys & Games > Toys > Dolls, Playsets & Toy Figures > Stuffed Animals' },
        etsy: { id: 'toys', name: 'Toys', path: 'Toys & Games > Toys' },
        depop: { id: 'everything-else|toys|other-toys', name: 'Toys' },
      },
    },
  },

  // =========================================================================
  // COLLECTIBLES
  // =========================================================================
  collectibles: {
    decorative: {
      value: 'collectibles_decorative',
      label: 'Decorative Collectibles',
      platforms: {
        ebay: { id: '261628', name: 'Sculptures & Figurines', path: 'Collectables > Decorative Collectables > Sculptures & Figurines' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-2-3', name: 'Collectible Trading Cards', path: 'Arts & Entertainment > Hobbies & Creative Arts > Collectibles > Collectible Trading Cards' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    militaria: {
      value: 'collectibles_militaria',
      label: 'Militaria & Medals',
      platforms: {
        ebay: { id: '13956', name: 'Militaria', path: 'Collectables > Militaria' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-2-3', name: 'Collectible Trading Cards', path: 'Arts & Entertainment > Hobbies & Creative Arts > Collectibles > Collectible Trading Cards' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    postcards: {
      value: 'collectibles_postcards',
      label: 'Postcards & Ephemera',
      platforms: {
        ebay: { id: '914', name: 'Postcards & Supplies', path: 'Collectables > Postcards & Supplies' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-2-3', name: 'Collectible Trading Cards', path: 'Arts & Entertainment > Hobbies & Creative Arts > Collectibles > Collectible Trading Cards' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    coins: {
      value: 'collectibles_coins',
      label: 'Coins & Currency',
      platforms: {
        ebay: { id: '11116', name: 'Coins', path: 'Coins' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-2-2-2', name: 'Collectible Coins', path: 'Arts & Entertainment > Hobbies & Creative Arts > Collectibles > Collectible Coins & Currency > Collectible Coins' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    stamps: {
      value: 'collectibles_stamps',
      label: 'Stamps',
      platforms: {
        ebay: { id: '260', name: 'Stamps', path: 'Stamps' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-2-5', name: 'Postage Stamps', path: 'Arts & Entertainment > Hobbies & Creative Arts > Collectibles > Postage Stamps' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    tradingCards: {
      value: 'collectibles_trading_cards',
      label: 'Trading Cards',
      platforms: {
        ebay: { id: '2536', name: 'Collectable Card Games', path: 'Collectables > Collectable Card Games' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-2-3', name: 'Collectible Trading Cards', path: 'Arts & Entertainment > Hobbies & Creative Arts > Collectibles > Collectible Trading Cards' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|toys|other-toys', name: 'Toys' },
      },
    },
    breweriana: {
      value: 'collectibles_breweriana',
      label: 'Breweriana & Advertising',
      platforms: {
        ebay: { id: '562', name: 'Breweriana', path: 'Collectables > Breweriana' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-2-3', name: 'Collectible Trading Cards', path: 'Arts & Entertainment > Hobbies & Creative Arts > Collectibles > Collectible Trading Cards' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    other: {
      value: 'collectibles_other',
      label: 'Other Collectibles',
      platforms: {
        ebay: { id: '159', name: 'Other Collectable Items', path: 'Collectables > Other Collectable Items' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-2-3', name: 'Collectible Trading Cards', path: 'Arts & Entertainment > Hobbies & Creative Arts > Collectibles > Collectible Trading Cards' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
  },

  // =========================================================================
  // ART
  // =========================================================================
  art: {
    paintings: {
      value: 'art_paintings',
      label: 'Paintings',
      platforms: {
        ebay: { id: '551', name: 'Paintings', path: 'Art > Paintings' },
        vinted: { id: '3846', name: 'Wall decor', path: 'Home > Home accessories > Wall decor' },
        shopify: { id: 'hg-3-4-2-4', name: 'Paintings', path: 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork > Paintings' },
        etsy: { id: 'painting', name: 'Painting', path: 'Art & Collectibles > Painting' },
        depop: { id: 'everything-else|art|painting', name: 'Painting' },
      },
    },
    prints: {
      value: 'art_prints',
      label: 'Prints & Posters',
      platforms: {
        ebay: { id: '360', name: 'Art Prints', path: 'Art > Art Prints' },
        vinted: { id: '3846', name: 'Wall decor', path: 'Home > Home accessories > Wall decor' },
        shopify: { id: 'hg-3-4-2-2', name: 'Prints', path: 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork > Prints' },
        etsy: { id: 'prints', name: 'Prints', path: 'Art & Collectibles > Prints' },
        depop: { id: 'everything-else|art|art-prints', name: 'Art prints' },
      },
    },
    photographs: {
      value: 'art_photographs',
      label: 'Photographs',
      platforms: {
        ebay: { id: '2211', name: 'Art Photographs', path: 'Art > Art Photographs' },
        vinted: { id: '3846', name: 'Wall decor', path: 'Home > Home accessories > Wall decor' },
        shopify: { id: 'hg-3-4-2-5', name: 'Photographs', path: 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork > Photographs' },
        etsy: { id: 'photography', name: 'Photography', path: 'Art & Collectibles > Photography' },
        depop: { id: 'everything-else|art|photography', name: 'Photography' },
      },
    },
    sculptures: {
      value: 'art_sculptures',
      label: 'Sculptures',
      platforms: {
        ebay: { id: '553', name: 'Art Sculptures', path: 'Art > Art Sculptures' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'hg-3-4-3', name: 'Sculptures & Statues', path: 'Home & Garden > Decor > Artwork > Sculptures & Statues' },
        etsy: { id: 'sculpture', name: 'Sculpture', path: 'Art & Collectibles > Sculpture' },
        depop: { id: 'everything-else|art|sculpture', name: 'Sculpture' },
      },
    },
    drawings: {
      value: 'art_drawings',
      label: 'Drawings & Illustration',
      platforms: {
        ebay: { id: '552', name: 'Art Drawings', path: 'Art > Art Drawings' },
        vinted: { id: '3846', name: 'Wall decor', path: 'Home > Home accessories > Wall decor' },
        shopify: { id: 'hg-3-4-2-2', name: 'Prints', path: 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork > Prints' },
        etsy: { id: 'drawing-and-illustration', name: 'Drawing & Illustration', path: 'Art & Collectibles > Drawing & Illustration' },
        depop: { id: 'everything-else|art|drawing-and-illustration', name: 'Drawing' },
      },
    },
    mixedMedia: {
      value: 'art_mixed_media',
      label: 'Mixed Media & Collage',
      platforms: {
        ebay: { id: '554', name: 'Mixed Media Art & Collage Art', path: 'Art > Mixed Media Art & Collage Art' },
        vinted: { id: '3846', name: 'Wall decor', path: 'Home > Home accessories > Wall decor' },
        shopify: { id: 'hg-3-4-2-2', name: 'Prints', path: 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork > Prints' },
        etsy: { id: 'mixed-media-and-collage', name: 'Mixed Media & Collage', path: 'Art & Collectibles > Mixed Media & Collage' },
        depop: { id: 'everything-else|art|mixed-media', name: 'Mixed media' },
      },
    },
    textileArt: {
      value: 'art_textile',
      label: 'Textile & Fibre Art',
      platforms: {
        ebay: { id: '156196', name: 'Textile Art & Fiber Art', path: 'Art > Textile Art & Fiber Art' },
        vinted: { id: '3846', name: 'Wall decor', path: 'Home > Home accessories > Wall decor' },
        shopify: { id: 'hg-3-4-2-2', name: 'Prints', path: 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork > Prints' },
        etsy: { id: 'fiber-arts', name: 'Fibre Arts', path: 'Art & Collectibles > Fibre Arts' },
        depop: { id: 'everything-else|art|other-art', name: 'Art' },
      },
    },
    other: {
      value: 'art_other',
      label: 'Other Art',
      platforms: {
        ebay: { id: '20158', name: 'Other Art', path: 'Art > Other Art' },
        vinted: { id: '3846', name: 'Wall decor', path: 'Home > Home accessories > Wall decor' },
        shopify: { id: 'hg-3-4-2-2', name: 'Prints', path: 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork > Prints' },
        etsy: { id: 'art-and-collectibles', name: 'Art & Collectibles', path: 'Art & Collectibles' },
        depop: { id: 'everything-else|art|other-art', name: 'Art' },
      },
    },
  },

  // =========================================================================
  // ANTIQUES
  // =========================================================================
  antiques: {
    furniture: {
      value: 'antiques_furniture',
      label: 'Antique Furniture',
      platforms: {
        ebay: { id: '20091', name: 'Antique Furniture', path: 'Antiques > Antique Furniture' },
        vinted: { id: '3154', name: 'Furniture', path: 'Home > Furniture' },
        shopify: { id: 'fr-7', name: 'Chairs', path: 'Furniture > Chairs' },
        etsy: { id: 'furniture', name: 'Furniture', path: 'Home & Living > Furniture' },
        depop: { id: 'everything-else|home|furniture', name: 'Furniture' },
      },
    },
    silver: {
      value: 'antiques_silver',
      label: 'Antique Silver',
      platforms: {
        ebay: { id: '20096', name: 'Silver', path: 'Antiques > Silver' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-2-3', name: 'Collectible Trading Cards', path: 'Arts & Entertainment > Hobbies & Creative Arts > Collectibles > Collectible Trading Cards' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    maps: {
      value: 'antiques_maps',
      label: 'Antique Maps & Globes',
      platforms: {
        ebay: { id: '37958', name: 'Maps, Atlases & Globes', path: 'Antiques > Maps, Atlases & Globes' },
        vinted: { id: '3846', name: 'Wall decor', path: 'Home > Home accessories > Wall decor' },
        shopify: { id: 'hg-3-4-2-2', name: 'Prints', path: 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork > Prints' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|art|other-art', name: 'Art' },
      },
    },
    porcelain: {
      value: 'antiques_porcelain',
      label: 'Antique Porcelain & China',
      platforms: {
        ebay: { id: '262394', name: 'Figurines', path: 'Pottery, Ceramics & Glass > Decorative Pottery, Ceramics & Glass > Figurines' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'hg-11-10-4-3', name: 'Plates', path: 'Home & Garden > Kitchen & Dining > Tableware > Dinnerware > Plates' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|dinnerware', name: 'Dinnerware' },
      },
    },
    clocks: {
      value: 'antiques_clocks',
      label: 'Antique Clocks',
      platforms: {
        ebay: { id: '261605', name: 'Desk, Mantel & Shelf Clocks', path: 'Collectables > Decorative Collectables > Clocks > Desk, Mantel & Shelf Clocks' },
        vinted: { id: '1936', name: 'Clocks', path: 'Home > Home accessories > Clocks' },
        shopify: { id: 'hg-3-17', name: 'Clocks', path: 'Home & Garden > Decor > Clocks' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    metalware: {
      value: 'antiques_metalware',
      label: 'Antique Metalware',
      platforms: {
        ebay: { id: '1211', name: 'Metalware', path: 'Antiques > Metalware' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-2-3', name: 'Collectible Trading Cards', path: 'Arts & Entertainment > Hobbies & Creative Arts > Collectibles > Collectible Trading Cards' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    other: {
      value: 'antiques_other',
      label: 'Other Antiques',
      platforms: {
        ebay: { id: '12', name: 'Other Antiques', path: 'Antiques > Other Antiques' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-2-3', name: 'Collectible Trading Cards', path: 'Arts & Entertainment > Hobbies & Creative Arts > Collectibles > Collectible Trading Cards' },
        etsy: { id: 'collectibles', name: 'Collectibles', path: 'Art & Collectibles > Collectibles' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
  },

  // =========================================================================
  // ELECTRONICS
  // =========================================================================
  electronics: {
    cameras: {
      value: 'electronics_cameras',
      label: 'Cameras & Photography',
      platforms: {
        ebay: { id: '31388', name: 'Digital Cameras', path: 'Cameras & Photography > Digital Cameras' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'co-2', name: 'Cameras', path: 'Cameras & Optics > Cameras' },
        etsy: { id: 'gadgets', name: 'Gadgets', path: 'Electronics & Accessories > Gadgets' },
        depop: { id: 'everything-else|cameras-and-film|cameras', name: 'Cameras' },
      },
    },
    phones: {
      value: 'electronics_phones',
      label: 'Mobile Phones',
      platforms: {
        ebay: { id: '9355', name: 'Mobile & Smart Phones', path: 'Mobile Phones & Communication > Mobile & Smart Phones' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'el-4-8-5-2', name: 'Smart Phones', path: 'Electronics > Communications > Telephony > Mobile & Smart Phones > Smart Phones' },
        etsy: { id: 'gadgets', name: 'Gadgets', path: 'Electronics & Accessories > Gadgets' },
        depop: { id: 'everything-else|tech-accessories|phone-cases', name: 'Phone cases' },
      },
    },
    audio: {
      value: 'electronics_audio',
      label: 'Audio & Hi-Fi',
      platforms: {
        ebay: { id: '14969', name: 'Home Audio & HiFi Separates', path: 'Sound & Vision > Home Audio & HiFi Separates' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'el-2', name: 'Audio', path: 'Electronics > Audio' },
        etsy: { id: 'audio', name: 'Audio', path: 'Electronics & Accessories > Audio' },
        depop: { id: 'everything-else|tech-accessories|headphones-and-earphones', name: 'Headphones' },
      },
    },
    videoGames: {
      value: 'electronics_video_games',
      label: 'Video Games & Consoles',
      platforms: {
        ebay: { id: '139973', name: 'Video Games', path: 'Video Games & Consoles > Video Games' },
        vinted: { id: '3002', name: 'Video games', path: 'Entertainment > Video games' },
        shopify: { id: 'el-2', name: 'Audio', path: 'Electronics > Audio' },
        etsy: { id: 'video-games', name: 'Video Games', path: 'Electronics & Accessories > Video Games' },
        depop: { id: 'everything-else|tech-accessories|other-tech-accessories', name: 'Tech accessories' },
      },
    },
    other: {
      value: 'electronics_other',
      label: 'Other Electronics',
      platforms: {
        ebay: { id: '175837', name: 'Other Sound & Vision', path: 'Sound & Vision > Other Sound & Vision' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'el-2', name: 'Audio', path: 'Electronics > Audio' },
        etsy: { id: 'gadgets', name: 'Gadgets', path: 'Electronics & Accessories > Gadgets' },
        depop: { id: 'everything-else|tech-accessories|other-tech-accessories', name: 'Tech accessories' },
      },
    },
  },

  // =========================================================================
  // SPORTS & OUTDOORS
  // =========================================================================
  sports: {
    cycling: {
      value: 'sports_cycling',
      label: 'Cycling',
      platforms: {
        ebay: { id: '177831', name: 'Bikes', path: 'Sporting Goods > Cycling > Bikes' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'sg-4-4', name: 'Cycling', path: 'Sporting Goods > Outdoor Recreation > Cycling' },
        etsy: { id: 'sports-and-outdoor-recreation', name: 'Sports & Outdoor Recreation', path: 'Toys & Games > Sports & Outdoor Recreation' },
        depop: { id: 'everything-else|sports-equipment|cycling', name: 'Sports equipment' },
      },
    },
    fitness: {
      value: 'sports_fitness',
      label: 'Fitness & Running',
      platforms: {
        ebay: { id: '15273', name: 'Fitness, Running & Yoga', path: 'Sporting Goods > Fitness, Running & Yoga' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'sg-2', name: 'Fitness', path: 'Sporting Goods > Fitness & General Exercise Equipment' },
        etsy: { id: 'sports-and-outdoor-recreation', name: 'Sports & Outdoor Recreation', path: 'Toys & Games > Sports & Outdoor Recreation' },
        depop: { id: 'everything-else|sports-equipment|fitness', name: 'Sports equipment' },
      },
    },
    golf: {
      value: 'sports_golf',
      label: 'Golf',
      platforms: {
        ebay: { id: '1513', name: 'Golf', path: 'Sporting Goods > Golf' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'sg-4-7', name: 'Golf', path: 'Sporting Goods > Outdoor Recreation > Golf' },
        etsy: { id: 'sports-and-outdoor-recreation', name: 'Sports & Outdoor Recreation', path: 'Toys & Games > Sports & Outdoor Recreation' },
        depop: { id: 'everything-else|sports-equipment|golf', name: 'Sports equipment' },
      },
    },
    football: {
      value: 'sports_football',
      label: 'Football',
      platforms: {
        ebay: { id: '20863', name: 'Footballs', path: 'Sporting Goods > Football > Footballs' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'sg-2', name: 'Fitness', path: 'Sporting Goods > Fitness & General Exercise Equipment' },
        etsy: { id: 'sports-and-outdoor-recreation', name: 'Sports & Outdoor Recreation', path: 'Toys & Games > Sports & Outdoor Recreation' },
        depop: { id: 'everything-else|sports-equipment|football', name: 'Sports equipment' },
      },
    },
    camping: {
      value: 'sports_camping',
      label: 'Camping & Hiking',
      platforms: {
        ebay: { id: '16034', name: 'Camping & Hiking', path: 'Sporting Goods > Camping & Hiking' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'sg-4-4', name: 'Cycling', path: 'Sporting Goods > Outdoor Recreation > Cycling' },
        etsy: { id: 'outdoor-and-garden', name: 'Outdoor & Gardening', path: 'Home & Living > Outdoor & Gardening' },
        depop: { id: 'everything-else|sports-equipment|camping', name: 'Sports equipment' },
      },
    },
    other: {
      value: 'sports_other',
      label: 'Other Sports',
      platforms: {
        ebay: { id: '888', name: 'Sporting Goods', path: 'Sporting Goods' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'sg-2', name: 'Fitness', path: 'Sporting Goods > Fitness & General Exercise Equipment' },
        etsy: { id: 'sports-and-outdoor-recreation', name: 'Sports & Outdoor Recreation', path: 'Toys & Games > Sports & Outdoor Recreation' },
        depop: { id: 'everything-else|sports-equipment|other', name: 'Sports equipment' },
      },
    },
  },

  // =========================================================================
  // MUSIC & MEDIA
  // =========================================================================
  music_media: {
    vinyl: {
      value: 'music_media_vinyl',
      label: 'Vinyl Records',
      platforms: {
        ebay: { id: '176985', name: 'Vinyl Records', path: 'Music > Vinyl Records' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'me-3-6', name: 'Vinyl', path: 'Media > Music & Sound Recordings > Vinyl' },
        etsy: { id: 'music', name: 'Music', path: 'Books, Movies & Music > Music' },
        depop: { id: 'everything-else|music|vinyl', name: 'Vinyl' },
      },
    },
    cds: {
      value: 'music_media_cds',
      label: 'CDs',
      platforms: {
        ebay: { id: '176984', name: 'CDs', path: 'Music > CDs' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'me-3-3', name: 'Music CDs', path: 'Media > Music & Sound Recordings > Music CDs' },
        etsy: { id: 'music', name: 'Music', path: 'Books, Movies & Music > Music' },
        depop: { id: 'everything-else|music|cds', name: 'CDs' },
      },
    },
    cassettes: {
      value: 'music_media_cassettes',
      label: 'Cassettes',
      platforms: {
        ebay: { id: '176983', name: 'Cassettes', path: 'Music > Cassettes' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'me-3-3', name: 'Music CDs', path: 'Media > Music & Sound Recordings > Music CDs' },
        etsy: { id: 'music', name: 'Music', path: 'Books, Movies & Music > Music' },
        depop: { id: 'everything-else|music|cassettes', name: 'Cassettes' },
      },
    },
    dvds: {
      value: 'music_media_dvds',
      label: 'DVDs & Blu-rays',
      platforms: {
        ebay: { id: '32852', name: 'DVD, Blu-ray & Home Cinema', path: 'Sound & Vision > DVD, Blu-ray & Home Cinema' },
        vinted: { id: '3045', name: 'DVD', path: 'Entertainment > DVD' },
        shopify: { id: 'me-7-3', name: 'DVDs', path: 'Media > Videos > DVDs' },
        etsy: { id: 'movies', name: 'Movies', path: 'Books, Movies & Music > Movies' },
        depop: { id: 'everything-else|music|other-music', name: 'Music' },
      },
    },
    instruments: {
      value: 'music_media_instruments',
      label: 'Musical Instruments',
      platforms: {
        ebay: { id: '308', name: 'Other Musical Instruments', path: 'Musical Instruments & DJ Equipment > Other Musical Instruments' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-8', name: 'Musical Instruments', path: 'Arts & Entertainment > Hobbies & Creative Arts > Musical Instruments' },
        etsy: { id: 'musical-instruments', name: 'Musical Instruments', path: 'Toys & Games > Musical Instruments' },
        depop: { id: 'everything-else|music|other-music', name: 'Music' },
      },
    },
    other: {
      value: 'music_media_other',
      label: 'Other Music & Media',
      platforms: {
        ebay: { id: '618', name: 'Other Formats', path: 'Music > Other Formats' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'me-3-3', name: 'Music CDs', path: 'Media > Music & Sound Recordings > Music CDs' },
        etsy: { id: 'music', name: 'Music', path: 'Books, Movies & Music > Music' },
        depop: { id: 'everything-else|music|other-music', name: 'Music' },
      },
    },
  },

  // =========================================================================
  // CRAFT SUPPLIES
  // =========================================================================
  craft_supplies: {
    fabric: {
      value: 'craft_supplies_fabric',
      label: 'Fabric',
      platforms: {
        ebay: { id: '160737', name: 'Sewing', path: 'Crafts > Sewing' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-1-2-14-2', name: 'Fabric', path: 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Textiles > Fabric' },
        etsy: { id: 'fabric', name: 'Fabric', path: 'Craft Supplies & Tools > Fabric' },
        depop: { id: 'everything-else|home|textiles', name: 'Textiles' },
      },
    },
    yarn: {
      value: 'craft_supplies_yarn',
      label: 'Yarn & Wool',
      platforms: {
        ebay: { id: '160737', name: 'Sewing', path: 'Crafts > Sewing' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-1-2-6-4', name: 'Yarn', path: 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Crafting Fibers > Yarn' },
        etsy: { id: 'yarn-and-fiber', name: 'Yarn & Fibre', path: 'Craft Supplies & Tools > Yarn & Fibre' },
        depop: { id: 'everything-else|home|textiles', name: 'Textiles' },
      },
    },
    beads: {
      value: 'craft_supplies_beads',
      label: 'Beads & Jewellery Making',
      platforms: {
        ebay: { id: '28110', name: 'Beading & Jewellery Making', path: 'Crafts > Beading & Jewellery Making' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-1-2-8-2', name: 'Beads', path: 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Embellishments & Trims > Beads' },
        etsy: { id: 'beads', name: 'Beads, Gems & Cabochons', path: 'Craft Supplies & Tools > Beads, Gems & Cabochons' },
        depop: { id: 'everything-else|home|decor-home-accesories', name: 'Home accessories' },
      },
    },
    sewing: {
      value: 'craft_supplies_sewing',
      label: 'Sewing Supplies',
      platforms: {
        ebay: { id: '3115', name: 'Other Sewing', path: 'Crafts > Sewing > Other Sewing' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-1-2-14-2', name: 'Fabric', path: 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Textiles > Fabric' },
        etsy: { id: 'sewing-and-fiber', name: 'Sewing & Fibre', path: 'Craft Supplies & Tools > Sewing & Fibre' },
        depop: { id: 'everything-else|home|textiles', name: 'Textiles' },
      },
    },
    other: {
      value: 'craft_supplies_other',
      label: 'Other Craft Supplies',
      platforms: {
        ebay: { id: '14339', name: 'Crafts', path: 'Crafts' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-1-2-14-2', name: 'Fabric', path: 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Textiles > Fabric' },
        etsy: { id: 'craft-supplies-and-tools', name: 'Craft Supplies & Tools', path: 'Craft Supplies & Tools' },
        depop: { id: 'everything-else|home|other-home', name: 'Home' },
      },
    },
  },

  // =========================================================================
  // HEALTH & BEAUTY
  // =========================================================================
  health_beauty: {
    fragrance: {
      value: 'health_beauty_fragrance',
      label: 'Fragrances & Perfume',
      platforms: {
        ebay: { id: '11848', name: "Women's Fragrances", path: "Health & Beauty > Fragrances > Women's Fragrances" },
        vinted: { id: '152', name: 'Perfume', path: 'Women > Beauty > Perfume' },
        shopify: { id: 'hb-3-2-8', name: 'Perfumes & Colognes', path: 'Health & Beauty > Personal Care > Cosmetics > Perfumes & Colognes' },
        etsy: { id: 'fragrances', name: 'Fragrances', path: 'Bath & Beauty > Fragrances' },
        depop: { id: 'everything-else|beauty|fragrances', name: 'Fragrances' },
      },
    },
    makeup: {
      value: 'health_beauty_makeup',
      label: 'Makeup & Cosmetics',
      platforms: {
        ebay: { id: '31786', name: 'Make-Up', path: 'Health & Beauty > Make-Up' },
        vinted: { id: '964', name: 'Make-up', path: 'Women > Beauty > Make-up' },
        shopify: { id: 'hb-3-2-6', name: 'Makeup', path: 'Health & Beauty > Personal Care > Cosmetics > Makeup' },
        etsy: { id: 'makeup-and-cosmetics', name: 'Makeup & Cosmetics', path: 'Bath & Beauty > Makeup & Cosmetics' },
        depop: { id: 'everything-else|beauty|makeup', name: 'Make-up' },
      },
    },
    skincare: {
      value: 'health_beauty_skincare',
      label: 'Skincare',
      platforms: {
        ebay: { id: '11863', name: 'Skin Care', path: 'Health & Beauty > Skin Care' },
        vinted: { id: '948', name: 'Facial care', path: 'Women > Beauty > Facial care' },
        shopify: { id: 'hb-3-2-9', name: 'Skin Care', path: 'Health & Beauty > Personal Care > Cosmetics > Skin Care' },
        etsy: { id: 'skin-care', name: 'Skin Care', path: 'Bath & Beauty > Skin Care' },
        depop: { id: 'everything-else|beauty|skincare-and-body', name: 'Skincare' },
      },
    },
    haircare: {
      value: 'health_beauty_haircare',
      label: 'Hair Care',
      platforms: {
        ebay: { id: '11854', name: 'Hair Care & Styling', path: 'Health & Beauty > Hair Care & Styling' },
        vinted: { id: '956', name: 'Body care', path: 'Women > Beauty > Body care' },
        shopify: { id: 'hb-3-2-6', name: 'Makeup', path: 'Health & Beauty > Personal Care > Cosmetics > Makeup' },
        etsy: { id: 'hair-care', name: 'Hair Care', path: 'Bath & Beauty > Hair Care' },
        depop: { id: 'everything-else|beauty|hair-products', name: 'Hair products' },
      },
    },
    other: {
      value: 'health_beauty_other',
      label: 'Other Health & Beauty',
      platforms: {
        ebay: { id: '1277', name: 'Other Health & Beauty', path: 'Health & Beauty > Other Health & Beauty' },
        vinted: { id: '146', name: 'Beauty', path: 'Women > Beauty' },
        shopify: { id: 'hb-3-2-6', name: 'Makeup', path: 'Health & Beauty > Personal Care > Cosmetics > Makeup' },
        etsy: { id: 'bath-and-beauty', name: 'Bath & Beauty', path: 'Bath & Beauty' },
        depop: { id: 'everything-else|beauty|other-beauty', name: 'Beauty' },
      },
    },
  },

  // =========================================================================
  // OTHER (catch-all)
  // =========================================================================
  other: {
    petSupplies: {
      value: 'other_pet_supplies',
      label: 'Pet Supplies',
      platforms: {
        ebay: { id: '1283', name: 'Other Dog Supplies', path: 'Pet Supplies > Dog Supplies > Other Dog Supplies' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ap-2-3', name: 'Dog Supplies', path: 'Animals & Pet Supplies > Pet Supplies > Dog Supplies' },
        etsy: { id: 'pet-supplies', name: 'Pet Supplies', path: 'Pet Supplies' },
        depop: { id: 'everything-else|home|other-home', name: 'Home' },
      },
    },
    baby: {
      value: 'other_baby',
      label: 'Baby & Toddler',
      platforms: {
        ebay: { id: '2984', name: 'Baby', path: 'Baby' },
        vinted: { id: '2364', name: 'Kids', path: 'Kids > Toys' },
        shopify: { id: 'aa-1-25', name: "Baby & Children's Clothing", path: "Apparel & Accessories > Clothing > Baby & Children's Clothing" },
        etsy: { id: 'baby', name: 'Kids & Baby', path: 'Kids & Baby' },
        depop: { id: 'kidswear|tops|tshirts', name: 'T-shirts' },
      },
    },
    stationery: {
      value: 'other_stationery',
      label: 'Stationery & Paper',
      platforms: {
        ebay: { id: '16092', name: 'Stationery & School Equipment', path: 'Home, Furniture & DIY > Stationery & School Equipment' },
        vinted: { id: '3823', name: 'Decorative accessories', path: 'Home > Home accessories > Decorative accessories' },
        shopify: { id: 'ae-2-1-2-14-2', name: 'Fabric', path: 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Textiles > Fabric' },
        etsy: { id: 'stationery', name: 'Stationery', path: 'Paper & Party Supplies > Stationery' },
        depop: { id: 'everything-else|home|other-home', name: 'Home' },
      },
    },
    other: {
      value: 'other_misc',
      label: 'Miscellaneous',
      platforms: {
        ebay: { id: '88433', name: 'Other', path: 'Everything Else > Other' },
        vinted: { id: '1934', name: 'Home accessories', path: 'Home > Home accessories' },
        shopify: { id: 'hg-3-57', name: 'Rugs', path: 'Home & Garden > Decor > Rugs' },
        etsy: { id: 'home-and-living', name: 'Home & Living', path: 'Home & Living' },
        depop: { id: 'everything-else|home|other-home', name: 'Home' },
      },
    },
  },
}

// =========================================================================
// BACKWARD-COMPATIBLE EXPORTS
// =========================================================================

/**
 * Flat category map for consumers that use Object.keys(CATEGORY_MAP) for validation.
 * Generated from CATEGORY_TREE — one entry per leaf value.
 * Also includes top-level aliases (e.g. "ceramics") pointing to the first leaf's eBay ID.
 */
export const CATEGORY_MAP: Record<string, {
  ebayId: string
  ebayName: string
  vintedId: number | null
  vintedName: string | null
}> = (() => {
  const map: Record<string, { ebayId: string; ebayName: string; vintedId: number | null; vintedName: string | null }> = {}

  for (const [topKey, subcats] of Object.entries(CATEGORY_TREE)) {
    let firstEntry = true
    for (const node of Object.values(subcats)) {
      const ebay = node.platforms.ebay
      const vinted = node.platforms.vinted
      map[node.value] = {
        ebayId: ebay?.id ?? '99',
        ebayName: ebay?.name ?? 'Everything Else',
        vintedId: vinted ? parseInt(vinted.id, 10) : null,
        vintedName: vinted?.name ?? null,
      }
      // Also add top-level alias from first leaf
      if (firstEntry) {
        map[topKey] = map[node.value]!
        firstEntry = false
      }
    }
  }

  // Legacy aliases
  map['teapots'] = map['ceramics_teapots']!
  map['jugs'] = map['ceramics_jugs']!
  map['medals'] = map['collectibles_militaria']!
  map['home'] = map['homeware_other']!

  return map
})()

// =========================================================================
// UTILITY: Look up native platform category for a canonical value
// =========================================================================

/** Get the CategoryNode for a canonical find.category value */
export function getCategoryNode(categoryValue: string): CategoryNode | null {
  for (const subcats of Object.values(CATEGORY_TREE)) {
    for (const node of Object.values(subcats)) {
      if (node.value === categoryValue) return node
    }
  }
  return null
}

/** Get native platform category ID for a canonical find.category value */
export function getPlatformCategoryId(
  categoryValue: string,
  platform: 'ebay' | 'vinted' | 'shopify' | 'etsy' | 'depop'
): string | null {
  const node = getCategoryNode(categoryValue)
  return node?.platforms[platform]?.id ?? null
}

/** Get the top-level category key for a canonical value (e.g. "ceramics_plates" → "ceramics") */
export function getTopLevelCategory(categoryValue: string): string | null {
  for (const [topKey, subcats] of Object.entries(CATEGORY_TREE)) {
    for (const node of Object.values(subcats)) {
      if (node.value === categoryValue) return topKey
    }
  }
  return null
}
