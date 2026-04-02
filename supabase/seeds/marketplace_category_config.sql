-- Seed data for marketplace_category_config table
-- Covers all categories × vinted + ebay with field visibility rules

-- CERAMICS
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'ceramics', 'vinted', '1920',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Porcelain", "Bone China", "Stoneware", "Earthenware", "Terracotta", "Ceramic"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'ceramics', 'ebay', '870',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Porcelain", "Bone China", "Stoneware", "Earthenware", "Terracotta", "Ceramic"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

-- GLASSWARE
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'glassware', 'vinted', '2005',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Glass", "Crystal", "Cut Glass", "Pressed Glass", "Bohemian Glass"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'glassware', 'ebay', '11700',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Glass", "Crystal", "Cut Glass", "Pressed Glass", "Bohemian Glass"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

-- BOOKS
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'books', 'vinted', '2997',
  '{
    "colour": { "show": false },
    "material": { "show": false },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": false },
    "author": { "show": true, "required": false },
    "isbn": { "show": true, "required": false },
    "language": { "show": true, "required": false, "options": ["English", "French", "German", "Spanish", "Italian", "Welsh", "Other"] }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'books', 'ebay', '267',
  '{
    "colour": { "show": false },
    "material": { "show": false },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": false },
    "author": { "show": true, "required": false },
    "isbn": { "show": true, "required": false },
    "language": { "show": true, "required": false, "options": ["English", "French", "German", "Spanish", "Italian", "Welsh", "Other"] },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

-- JEWELLERY
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'jewellery', 'vinted', '21',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Gold", "Silver", "Rose Gold", "Platinum", "Brass", "Copper", "Enamel", "Resin", "Pearl", "Gemstone"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'jewellery', 'ebay', '281',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Gold", "Silver", "Rose Gold", "Platinum", "Brass", "Copper", "Enamel", "Resin", "Pearl", "Gemstone"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

-- CLOTHING
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'clothing', 'vinted', '4',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Cotton", "Polyester", "Wool", "Silk", "Linen", "Cashmere", "Denim", "Leather", "Synthetic"] },
    "size": { "show": true, "required": true },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'clothing', 'ebay', '11450',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Cotton", "Polyester", "Wool", "Silk", "Linen", "Cashmere", "Denim", "Leather", "Synthetic"] },
    "size": { "show": true, "required": true },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

-- HOMEWARE
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'homeware', 'vinted', '1934',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Wood", "Metal", "Plastic", "Fabric", "Glass", "Ceramic", "Wicker", "Resin"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'homeware', 'ebay', '11700',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Wood", "Metal", "Plastic", "Fabric", "Glass", "Ceramic", "Wicker", "Resin"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

-- COLLECTIBLES
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'collectibles', 'vinted', '3823',
  '{
    "colour": { "show": true, "required": false },
    "material": { "show": true, "required": false, "options": ["Metal", "Brass", "Bronze", "Silver", "Gold", "Enamel", "Ceramic", "Paper", "Wood"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'collectibles', 'ebay', '11116',
  '{
    "colour": { "show": true, "required": false },
    "material": { "show": true, "required": false, "options": ["Metal", "Brass", "Bronze", "Silver", "Gold", "Enamel", "Ceramic", "Paper", "Wood"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

-- MEDALS
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'medals', 'vinted', '167',
  '{
    "colour": { "show": false },
    "material": { "show": true, "required": false, "options": ["Metal", "Brass", "Bronze", "Silver", "Gold", "Enamel"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'medals', 'ebay', '15273',
  '{
    "colour": { "show": false },
    "material": { "show": true, "required": false, "options": ["Metal", "Brass", "Bronze", "Silver", "Gold", "Enamel"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": false },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

-- TOYS
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'toys', 'vinted', '1499',
  '{
    "colour": { "show": true, "required": false },
    "material": { "show": true, "required": false, "options": ["Plastic", "Wood", "Metal", "Fabric", "Rubber"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'toys', 'ebay', '220',
  '{
    "colour": { "show": true, "required": false },
    "material": { "show": true, "required": false, "options": ["Plastic", "Wood", "Metal", "Fabric", "Rubber"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

-- FURNITURE
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'furniture', 'vinted', '3154',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Wood", "Oak", "Pine", "Mahogany", "Walnut", "Metal", "Brass", "Iron", "Fabric", "Leather", "Glass", "Wicker"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'furniture', 'ebay', '3197',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Wood", "Oak", "Pine", "Mahogany", "Walnut", "Metal", "Brass", "Iron", "Fabric", "Leather", "Glass", "Wicker"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

-- TEAPOTS (same as ceramics)
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'teapots', 'vinted', '3856',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Porcelain", "Bone China", "Stoneware", "Earthenware", "Terracotta", "Ceramic"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'teapots', 'ebay', '870',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Porcelain", "Bone China", "Stoneware", "Earthenware", "Terracotta", "Ceramic"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

-- JUGS (same as ceramics)
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'jugs', 'vinted', '3857',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Porcelain", "Bone China", "Stoneware", "Earthenware", "Terracotta", "Ceramic"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'jugs', 'ebay', '870',
  '{
    "colour": { "show": true, "required": true, "max": 2 },
    "material": { "show": true, "required": false, "options": ["Porcelain", "Bone China", "Stoneware", "Earthenware", "Terracotta", "Ceramic"] },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": true, "required": false },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

-- OTHER (fallback category)
INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'other', 'vinted', NULL,
  '{
    "colour": { "show": true, "required": false },
    "material": { "show": false },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;

INSERT INTO marketplace_category_config (category, marketplace, platform_category_id, fields, source)
VALUES (
  'other', 'ebay', '99',
  '{
    "colour": { "show": true, "required": false },
    "material": { "show": false },
    "size": { "show": false },
    "condition_description": { "show": true, "required": false },
    "brand": { "show": false },
    "accept_offers": { "show": true, "required": false },
    "is_auction": { "show": true, "required": false }
  }',
  'manual'
)
ON CONFLICT (category, marketplace) DO NOTHING;
