#!/usr/bin/env python3
"""
Build expanded Wrenlist category tree + field requirements from Crosslist source data.

Reads:
  - src/data/marketplace/crosslist-categories-full.json
  - src/data/marketplace/crosslist-field-schemas.json

Outputs:
  - src/data/marketplace-category-map.ts (expanded tree, ~400-600 leaves)
  - src/data/marketplace/category-field-requirements.ts (field reqs per leaf)
  - src/data/marketplace/wrenlist-uuid-map.json (canonical → source UUIDs bridge)

Strategy: L2/L3 hybrid depth
  - L2 nodes with ≤ LEAF_THRESHOLD descendant leaves → L2 is the canonical leaf
  - L2 nodes with > LEAF_THRESHOLD descendant leaves → go to L3
  - "All X" catch-all leaves are absorbed into their parent, not standalone
"""

import json
import re
import os
from collections import defaultdict

# === Config ===
LEAF_THRESHOLD = 100  # L2 nodes with more descendants go to L3
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_TREE = os.path.join(BASE_DIR, "src/data/marketplace/crosslist-categories-full.json")
SRC_FIELDS = os.path.join(BASE_DIR, "src/data/marketplace/crosslist-field-schemas.json")
OUT_TREE = os.path.join(BASE_DIR, "src/data/marketplace-category-map.ts")
OUT_FIELDS = os.path.join(BASE_DIR, "src/data/marketplace/category-field-requirements.ts")
OUT_UUID_MAP = os.path.join(BASE_DIR, "src/data/marketplace/wrenlist-uuid-map.json")

# === Top-level slug overrides (cleaner names than auto-slugify) ===
TOP_LEVEL_SLUGS = {
    "Antiques": "antiques",
    "Art": "art",
    "Baby & toddler": "baby_toddler",
    "Books, movies & music": "books_media",
    "Clothing, shoes & accessories": "clothing",
    "Craft supplies": "craft_supplies",
    "Collectibles": "collectibles",
    "Electronics": "electronics",
    "Health & beauty": "health_beauty",
    "Home & garden": "home_garden",
    "Musical instruments": "musical_instruments",
    "Pet supplies": "pet_supplies",
    "Sports & outdoors": "sports_outdoors",
    "Toys & games": "toys_games",
    "Vehicles & parts": "vehicles_parts",
    "Other": "other",
}

# === Helpers ===

def slugify(text: str) -> str:
    """Convert a title to a valid slug: lowercase, underscores, no special chars."""
    s = text.lower().strip()
    s = re.sub(r"[''']s\b", "s", s)  # Women's → Womens
    s = re.sub(r"&", "and", s)
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = s.strip("_")
    return s


def collect_leaf_uuids(node):
    """Recursively collect all leaf UUIDs under a node."""
    if node["isLeaf"]:
        return [node["id"]]
    uuids = []
    for child in node.get("children", []):
        uuids.extend(collect_leaf_uuids(child))
    return uuids


def count_leaves(node):
    """Count descendant leaves."""
    if node["isLeaf"]:
        return 1
    return sum(count_leaves(c) for c in node.get("children", []))


def is_catch_all(title: str) -> bool:
    """Check if this is an 'All X' catch-all category."""
    return title.lower().startswith("all ")


# === Step 1: Build expanded tree ===

def build_expanded_tree(crosslist_tree):
    """
    Build the expanded canonical tree from Crosslist source data.
    Returns: { top_slug: { sub_key: { value, label, wrenlistUuids } } }
    """
    tree = {}
    uuid_map = {}  # canonical_value → [uuids]
    stats = {"top_levels": 0, "leaves": 0, "uuids_mapped": 0}

    for root in crosslist_tree:
        top_slug = TOP_LEVEL_SLUGS.get(root["title"])
        if not top_slug:
            print(f"  WARN: No slug for top-level '{root['title']}', skipping")
            continue

        stats["top_levels"] += 1
        tree[top_slug] = {}

        children = root.get("children", [])
        if not children:
            # Top-level is itself a leaf (unlikely but handle it)
            if root["isLeaf"]:
                key = "general"
                value = f"{top_slug}_general"
                tree[top_slug][key] = {
                    "value": value,
                    "label": root["title"],
                    "wrenlistUuids": [root["id"]],
                }
                uuid_map[value] = [root["id"]]
                stats["leaves"] += 1
            continue

        for l2_node in children:
            l2_title = l2_node["title"]

            # Skip "All X" nodes at L2 — their UUID goes into the top-level fallback
            if is_catch_all(l2_title):
                # Create a "general" catch-all for this top-level
                gen_key = "general"
                gen_value = f"{top_slug}_general"
                if gen_key not in tree[top_slug]:
                    tree[top_slug][gen_key] = {
                        "value": gen_value,
                        "label": f"Other {root['title']}",
                        "wrenlistUuids": [],
                    }
                    uuid_map[gen_value] = []
                tree[top_slug][gen_key]["wrenlistUuids"].extend(collect_leaf_uuids(l2_node))
                uuid_map[gen_value] = tree[top_slug][gen_key]["wrenlistUuids"]
                continue

            l2_leaves = count_leaves(l2_node)
            l2_slug = slugify(l2_title)

            if l2_node["isLeaf"]:
                # L2 is itself a leaf
                value = f"{top_slug}_{l2_slug}"
                tree[top_slug][l2_slug] = {
                    "value": value,
                    "label": l2_title,
                    "wrenlistUuids": [l2_node["id"]],
                }
                uuid_map[value] = [l2_node["id"]]
                stats["leaves"] += 1

            elif l2_leaves <= LEAF_THRESHOLD:
                # Small branch — L2 becomes the canonical leaf, aggregating all children
                uuids = collect_leaf_uuids(l2_node)
                value = f"{top_slug}_{l2_slug}"
                tree[top_slug][l2_slug] = {
                    "value": value,
                    "label": l2_title,
                    "wrenlistUuids": uuids,
                }
                uuid_map[value] = uuids
                stats["leaves"] += 1

            else:
                # Large branch — go to L3
                l3_children = l2_node.get("children", [])
                for l3_node in l3_children:
                    l3_title = l3_node["title"]

                    if is_catch_all(l3_title):
                        # Absorb into L2 general
                        gen_key = f"{l2_slug}_general"
                        gen_value = f"{top_slug}_{gen_key}"
                        if gen_key not in tree[top_slug]:
                            tree[top_slug][gen_key] = {
                                "value": gen_value,
                                "label": f"Other {l2_title}",
                                "wrenlistUuids": [],
                            }
                            uuid_map[gen_value] = []
                        tree[top_slug][gen_key]["wrenlistUuids"].extend(collect_leaf_uuids(l3_node))
                        uuid_map[gen_value] = tree[top_slug][gen_key]["wrenlistUuids"]
                        continue

                    l3_slug = slugify(l3_title)
                    compound_key = f"{l2_slug}_{l3_slug}"
                    value = f"{top_slug}_{compound_key}"
                    uuids = collect_leaf_uuids(l3_node)

                    tree[top_slug][compound_key] = {
                        "value": value,
                        "label": l3_title,
                        "wrenlistUuids": uuids,
                    }
                    uuid_map[value] = uuids
                    stats["leaves"] += 1

    stats["uuids_mapped"] = sum(len(v) for v in uuid_map.values())
    return tree, uuid_map, stats


# === Step 2: Build field requirements ===

def build_field_requirements(uuid_map, cat_to_field_set, field_sets):
    """
    For each canonical leaf, resolve its wrenlistUuids to field sets
    and aggregate field requirements by marketplace.
    """
    requirements = {}

    for canonical_value, uuids in uuid_map.items():
        if not uuids:
            continue

        # Collect all field set indices for this canonical leaf
        fs_indices = set()
        for uuid in uuids:
            idx = cat_to_field_set.get(uuid)
            if idx is not None:
                fs_indices.add(idx)

        if not fs_indices:
            continue

        # Aggregate fields by marketplace
        mp_fields = defaultdict(dict)  # mp → { field_name → field_def }

        for idx in fs_indices:
            if idx >= len(field_sets):
                continue
            fs = field_sets[idx]
            for field in fs["fields"]:
                for mp in field["mp"]:
                    name = field["n"]
                    existing = mp_fields[mp].get(name)
                    if existing:
                        # If any fieldSet marks it required, it's required
                        if field["r"] == 1:
                            existing["required"] = True
                        # If any marks it highlighted, it's highlighted
                        if field.get("h") == 1:
                            existing["highlighted"] = True
                    else:
                        field_type = {
                            "SelectList": "select",
                            "TextBox": "text",
                            "TextArea": "text",
                            "Checkbox": "checkbox",
                        }.get(field["t"], "text")

                        mp_fields[mp][name] = {
                            "name": name,
                            "label": field["l"],
                            "type": field_type,
                            "required": field["r"] == 1,
                            "highlighted": field.get("h") == 1,
                        }

        if mp_fields:
            req = {}
            for mp in sorted(mp_fields.keys()):
                # Sort: required first, then highlighted, then alphabetical
                fields = sorted(
                    mp_fields[mp].values(),
                    key=lambda f: (not f["required"], not f["highlighted"], f["name"]),
                )
                req[mp] = fields
            requirements[canonical_value] = req

    return requirements


# === Step 3: Output TypeScript files ===

def write_tree_ts(tree, out_path):
    """Write the expanded CATEGORY_TREE as TypeScript."""
    lines = []
    lines.append("/**")
    lines.append(" * Wrenlist Canonical Category Tree — Phase 3 (auto-generated)")
    lines.append(" *")
    lines.append(" * Generated by scripts/build-category-data.py from Crosslist source data.")
    lines.append(" * DO NOT EDIT MANUALLY — re-run the script to regenerate.")
    lines.append(" *")
    lines.append(" * Architecture: Option C (Hybrid)")
    lines.append(" * - finds.category stores the canonical value (e.g. 'clothing_womenswear_dresses')")
    lines.append(" * - product_marketplace_data.platform_category_id stores per-marketplace overrides")
    lines.append(" */")
    lines.append("")
    lines.append("import type { CategoryNode, CategoryTree } from '@/types/categories'")
    lines.append("")
    lines.append("// Re-export type for backward compatibility")
    lines.append("export type { CategoryNode } from '@/types/categories'")
    lines.append("")
    lines.append("export const CATEGORY_TREE: CategoryTree = {")

    for top_slug in sorted(tree.keys()):
        subcats = tree[top_slug]
        lines.append(f"  {top_slug}: {{")

        for sub_key in sorted(subcats.keys()):
            node = subcats[sub_key]
            # Use camelCase for TS keys with special chars
            ts_key = sub_key
            lines.append(f"    {ts_key}: {{")
            lines.append(f"      value: '{node['value']}',")
            lines.append(f"      label: {json.dumps(node['label'])},")
            lines.append(f"      platforms: {{}},")
            lines.append(f"    }},")

        lines.append(f"  }},")

    lines.append("}")
    lines.append("")

    # CATEGORY_MAP flat export
    lines.append("/** Flat lookup: canonical value → { label, topLevel } */")
    lines.append("export const CATEGORY_MAP: Record<string, { label: string; topLevel: string }> = (() => {")
    lines.append("  const map: Record<string, { label: string; topLevel: string }> = {}")
    lines.append("  for (const [topKey, subcats] of Object.entries(CATEGORY_TREE)) {")
    lines.append("    for (const node of Object.values(subcats)) {")
    lines.append("      map[node.value] = { label: node.label, topLevel: topKey }")
    lines.append("    }")
    lines.append("  }")
    lines.append("  return map")
    lines.append("})()")
    lines.append("")

    # Utility functions
    lines.append("/** Look up a leaf node by its canonical value */")
    lines.append("export function getCategoryNode(categoryValue: string): CategoryNode | undefined {")
    lines.append("  // Check legacy mapping first")
    lines.append("  const resolved = LEGACY_CATEGORY_MAP[categoryValue] ?? categoryValue")
    lines.append("  for (const subcats of Object.values(CATEGORY_TREE)) {")
    lines.append("    for (const node of Object.values(subcats)) {")
    lines.append("      if (node.value === resolved) return node")
    lines.append("    }")
    lines.append("  }")
    lines.append("  return undefined")
    lines.append("}")
    lines.append("")

    lines.append("/** Get the platform-specific category ID for a canonical value */")
    lines.append("export function getPlatformCategoryId(")
    lines.append("  categoryValue: string,")
    lines.append("  platform: 'ebay' | 'vinted' | 'shopify' | 'etsy' | 'depop'")
    lines.append("): string | undefined {")
    lines.append("  const node = getCategoryNode(categoryValue)")
    lines.append("  return node?.platforms[platform]?.id")
    lines.append("}")
    lines.append("")

    lines.append("/** Extract the top-level key from a canonical value */")
    lines.append("/** Valid top-level keys for fallback resolution */")
    lines.append("const TOP_LEVEL_KEYS = new Set(Object.keys(CATEGORY_TREE))")
    lines.append("")
    lines.append("export function getTopLevelCategory(categoryValue: string): string {")
    lines.append("  const resolved = LEGACY_CATEGORY_MAP[categoryValue] ?? categoryValue")
    lines.append("  const entry = CATEGORY_MAP[resolved]")
    lines.append("  if (entry) return entry.topLevel")
    lines.append("  // Fallback: try progressively longer prefixes (handles multi-segment keys like 'home_garden')")
    lines.append("  const parts = resolved.split('_')")
    lines.append("  for (let i = parts.length - 1; i >= 1; i--) {")
    lines.append("    const prefix = parts.slice(0, i).join('_')")
    lines.append("    if (TOP_LEVEL_KEYS.has(prefix)) return prefix")
    lines.append("  }")
    lines.append("  return parts[0] ?? resolved")
    lines.append("}")
    lines.append("")

    # Legacy mapping placeholder
    lines.append("/**")
    lines.append(" * Legacy category value mapping (Phase 2 → Phase 3)")
    lines.append(" * Maps old canonical values to new ones for backward compatibility.")
    lines.append(" * Existing finds.category values in the DB resolve transparently.")
    lines.append(" */")
    lines.append("export const LEGACY_CATEGORY_MAP: Record<string, string> = {")
    lines.append("  // === Ceramics (old top-level) → Home & Garden / Collectibles ===")
    lines.append("  ceramics_plates: 'home_garden_kitchen_and_dining',")
    lines.append("  ceramics_bowls: 'home_garden_kitchen_and_dining',")
    lines.append("  ceramics_dinner_sets: 'home_garden_kitchen_and_dining',")
    lines.append("  ceramics_mugs: 'home_garden_kitchen_and_dining',")
    lines.append("  ceramics_teapots: 'home_garden_kitchen_and_dining',")
    lines.append("  ceramics_jugs: 'home_garden_kitchen_and_dining',")
    lines.append("  ceramics_vases: 'home_garden_home_decor',")
    lines.append("  ceramics_figurines: 'collectibles_collectible_figures_and_supplies',")
    lines.append("  ceramics_planters: 'home_garden_outdoor_and_garden_general',")
    lines.append("  ceramics_storage_jars: 'home_garden_storage_and_organization',")
    lines.append("  ceramics_other: 'collectibles_general',")
    lines.append("")
    lines.append("  // === Glassware (old top-level) → Home & Garden / Collectibles ===")
    lines.append("  glassware_drinking: 'home_garden_kitchen_and_dining',")
    lines.append("  glassware_vases: 'home_garden_home_decor',")
    lines.append("  glassware_bowls: 'home_garden_kitchen_and_dining',")
    lines.append("  glassware_ornamental: 'home_garden_home_decor',")
    lines.append("  glassware_candleholders: 'home_garden_home_decor',")
    lines.append("  glassware_other: 'home_garden_general',")
    lines.append("")
    lines.append("  // === Bare top-level legacy keys (no sub-value) ===")
    lines.append("  books: 'books_media_books',")
    lines.append("  medals: 'collectibles_militaria_general',")
    lines.append("")
    lines.append("  // === Books (old) → books_media ===")
    lines.append("  books_fiction: 'books_media_books',")
    lines.append("  books_non_fiction: 'books_media_books',")
    lines.append("  books_childrens: 'books_media_books',")
    lines.append("  books_cookbooks: 'books_media_books',")
    lines.append("  books_art_photography: 'books_media_books',")
    lines.append("  books_reference: 'books_media_books',")
    lines.append("  books_vintage_antique: 'books_media_books',")
    lines.append("  books_other: 'books_media_books',")
    lines.append("")
    lines.append("  // === Jewellery (old) → Clothing (Crosslist puts jewellery under clothing) ===")
    lines.append("  jewellery_necklaces: 'clothing_womenswear_womens_jewelry',")
    lines.append("  jewellery_rings: 'clothing_womenswear_womens_jewelry',")
    lines.append("  jewellery_earrings: 'clothing_womenswear_womens_jewelry',")
    lines.append("  jewellery_bracelets: 'clothing_womenswear_womens_jewelry',")
    lines.append("  jewellery_brooches: 'clothing_womenswear_womens_jewelry',")
    lines.append("  jewellery_watches: 'clothing_womenswear_womens_accessories',")
    lines.append("  jewellery_vintage: 'clothing_womenswear_womens_jewelry',")
    lines.append("  jewellery_mens: 'clothing_menswear_mens_accessories',")
    lines.append("  jewellery_other: 'clothing_womenswear_womens_jewelry',")
    lines.append("")
    lines.append("  // === Clothing (old) — mostly maps to new clothing_ prefixed values ===")
    lines.append("  clothing_womens_tops: 'clothing_womenswear_womens_tops_and_blouses',")
    lines.append("  clothing_womens_dresses: 'clothing_womenswear_womens_dresses',")
    lines.append("  clothing_womens_bottoms: 'clothing_womenswear_womens_pants',")
    lines.append("  clothing_womens_outerwear: 'clothing_womenswear_womens_outerwear',")
    lines.append("  clothing_womens_knitwear: 'clothing_womenswear_womens_sweaters',")
    lines.append("  clothing_womens_shoes: 'clothing_womenswear_womens_shoes',")
    lines.append("  clothing_womens_bags: 'clothing_womenswear_womens_bags',")
    lines.append("  clothing_mens_tops: 'clothing_menswear_mens_tops_and_shirts',")
    lines.append("  clothing_mens_bottoms: 'clothing_menswear_mens_pants',")
    lines.append("  clothing_mens_outerwear: 'clothing_menswear_mens_outerwear',")
    lines.append("  clothing_mens_shoes: 'clothing_menswear_mens_shoes',")
    lines.append("  clothing_mens_accessories: 'clothing_menswear_mens_accessories',")
    lines.append("  clothing_vintage: 'clothing_womenswear_general',")
    lines.append("  clothing_other: 'clothing_womenswear_general',")
    lines.append("")
    lines.append("  // === Homeware (old) → Home & Garden ===")
    lines.append("  homeware_cushions: 'home_garden_bedding',")
    lines.append("  homeware_throws: 'home_garden_bedding',")
    lines.append("  homeware_rugs: 'home_garden_home_decor',")
    lines.append("  homeware_curtains: 'home_garden_home_decor',")
    lines.append("  homeware_lamps: 'home_garden_home_decor',")
    lines.append("  homeware_mirrors: 'home_garden_home_decor',")
    lines.append("  homeware_clocks: 'home_garden_home_decor',")
    lines.append("  homeware_frames: 'home_garden_home_decor',")
    lines.append("  homeware_storage: 'home_garden_storage_and_organization',")
    lines.append("  homeware_kitchen: 'home_garden_kitchen_and_dining',")
    lines.append("  homeware_other: 'home_garden_general',")
    lines.append("")
    lines.append("  // === Furniture (old) → Home & Garden ===")
    lines.append("  furniture_chairs: 'home_garden_furniture',")
    lines.append("  furniture_tables: 'home_garden_furniture',")
    lines.append("  furniture_storage: 'home_garden_furniture',")
    lines.append("  furniture_shelving: 'home_garden_furniture',")
    lines.append("  furniture_desks: 'home_garden_furniture',")
    lines.append("  furniture_bedroom: 'home_garden_furniture',")
    lines.append("  furniture_outdoor: 'home_garden_outdoor_and_garden_general',")
    lines.append("  furniture_other: 'home_garden_furniture',")
    lines.append("")
    lines.append("  // === Toys (old) → Toys & Games ===")
    lines.append("  toys_board_games: 'toys_games_general',")
    lines.append("  toys_puzzles: 'toys_games_general',")
    lines.append("  toys_action_figures: 'toys_games_general',")
    lines.append("  toys_dolls: 'toys_games_general',")
    lines.append("  toys_construction: 'toys_games_general',")
    lines.append("  toys_educational: 'toys_games_general',")
    lines.append("  toys_outdoor: 'toys_games_general',")
    lines.append("  toys_vintage: 'toys_games_general',")
    lines.append("  toys_other: 'toys_games_general',")
    lines.append("")
    lines.append("  // === Collectibles (old) — sub-values shift ===")
    lines.append("  collectibles_coins: 'collectibles_coins_and_money_general',")
    lines.append("  collectibles_stamps: 'collectibles_stamps_general',")
    lines.append("  collectibles_cards: 'collectibles_trading_cards',")
    lines.append("  collectibles_militaria: 'collectibles_militaria_general',")
    lines.append("  collectibles_advertising: 'collectibles_advertising_general',")
    lines.append("  collectibles_vintage_signs: 'collectibles_advertising_general',")
    lines.append("  collectibles_memorabilia: 'collectibles_general',")
    lines.append("  collectibles_other: 'collectibles_general',")
    lines.append("")
    lines.append("  // === Art (old) — maps directly ===")
    lines.append("  art_paintings: 'art_paintings',")
    lines.append("  art_prints: 'art_posters_and_prints',")
    lines.append("  art_photographs: 'art_photographs',")
    lines.append("  art_sculptures: 'art_sculptures',")
    lines.append("  art_drawings: 'art_drawings_and_illustrations',")
    lines.append("  art_mixed_media: 'art_mixed_media',")
    lines.append("  art_textile: 'art_fiber_and_textile_art',")
    lines.append("  art_other: 'art_general',")
    lines.append("")
    lines.append("  // === Antiques (old) — maps directly ===")
    lines.append("  antiques_furniture: 'antiques_antique_furniture',")
    lines.append("  antiques_ceramics: 'antiques_general',")
    lines.append("  antiques_silver: 'antiques_general',")
    lines.append("  antiques_glass: 'antiques_general',")
    lines.append("  antiques_textiles: 'antiques_general',")
    lines.append("  antiques_clocks: 'antiques_general',")
    lines.append("  antiques_other: 'antiques_general',")
    lines.append("")
    lines.append("  // === Electronics (old) ===")
    lines.append("  electronics_phones: 'electronics_general',")
    lines.append("  electronics_computers: 'electronics_general',")
    lines.append("  electronics_audio: 'electronics_general',")
    lines.append("  electronics_cameras: 'electronics_general',")
    lines.append("  electronics_other: 'electronics_general',")
    lines.append("")
    lines.append("  // === Sports (old) ===")
    lines.append("  sports_equipment: 'sports_outdoors_general',")
    lines.append("  sports_clothing: 'sports_outdoors_general',")
    lines.append("  sports_footwear: 'sports_outdoors_general',")
    lines.append("  sports_accessories: 'sports_outdoors_general',")
    lines.append("  sports_vintage: 'sports_outdoors_general',")
    lines.append("  sports_other: 'sports_outdoors_general',")
    lines.append("")
    lines.append("  // === Music & Media (old) → Books & Media ===")
    lines.append("  music_media_vinyl: 'books_media_music',")
    lines.append("  music_media_cds: 'books_media_music',")
    lines.append("  music_media_cassettes: 'books_media_music',")
    lines.append("  music_media_dvds: 'books_media_movies',")
    lines.append("  music_media_equipment: 'musical_instruments_general',")
    lines.append("  music_media_other: 'books_media_general',")
    lines.append("")
    lines.append("  // === Craft Supplies (old) ===")
    lines.append("  craft_supplies_fabric: 'craft_supplies_general',")
    lines.append("  craft_supplies_yarn: 'craft_supplies_general',")
    lines.append("  craft_supplies_beads: 'craft_supplies_general',")
    lines.append("  craft_supplies_tools: 'craft_supplies_general',")
    lines.append("  craft_supplies_other: 'craft_supplies_general',")
    lines.append("")
    lines.append("  // === Health & Beauty (old) ===")
    lines.append("  health_beauty_skincare: 'health_beauty_general',")
    lines.append("  health_beauty_haircare: 'health_beauty_general',")
    lines.append("  health_beauty_makeup: 'health_beauty_general',")
    lines.append("  health_beauty_fragrance: 'health_beauty_general',")
    lines.append("  health_beauty_other: 'health_beauty_general',")
    lines.append("")
    lines.append("  // === Other (old) ===")
    lines.append("  other_mixed_lots: 'other_general',")
    lines.append("  other_services: 'other_general',")
    lines.append("  other_gift_cards: 'other_general',")
    lines.append("  other_uncategorised: 'other_general',")
    lines.append("}")
    lines.append("")

    with open(out_path, "w") as f:
        f.write("\n".join(lines) + "\n")


def write_field_requirements_ts(requirements, out_path):
    """Write the field requirements as TypeScript."""
    lines = []
    lines.append("/**")
    lines.append(" * Category field requirements per marketplace — Phase 3 (auto-generated)")
    lines.append(" *")
    lines.append(" * Generated by scripts/build-category-data.py from Crosslist field schemas.")
    lines.append(" * DO NOT EDIT MANUALLY — re-run the script to regenerate.")
    lines.append(" *")
    lines.append(" * Coverage: eBay (item specifics), Vinted (required attributes)")
    lines.append(" */")
    lines.append("")
    lines.append("import type { CategoryFieldDef } from '@/types/categories'")
    lines.append("")
    lines.append("export interface CategoryFieldRequirements {")
    lines.append("  ebay?: CategoryFieldDef[]")
    lines.append("  vinted?: CategoryFieldDef[]")
    lines.append("}")
    lines.append("")
    lines.append("export const CATEGORY_FIELD_REQUIREMENTS: Record<string, CategoryFieldRequirements> = {")

    for value in sorted(requirements.keys()):
        req = requirements[value]
        lines.append(f"  '{value}': {{")
        for mp in sorted(req.keys()):
            fields = req[mp]
            lines.append(f"    {mp}: [")
            for field in fields:
                hl = ", highlighted: true" if field.get("highlighted") else ""
                req_str = "true" if field["required"] else "false"
                lines.append(
                    f"      {{ name: {json.dumps(field['name'])}, label: {json.dumps(field['label'])}, "
                    f"type: '{field['type']}', required: {req_str}{hl} }},"
                )
            lines.append(f"    ],")
        lines.append(f"  }},")

    lines.append("}")
    lines.append("")

    # Lookup helpers
    lines.append("/** Get field requirements for a category + marketplace */")
    lines.append("export function getCategoryFields(")
    lines.append("  category: string,")
    lines.append("  marketplace: 'ebay' | 'vinted'")
    lines.append("): CategoryFieldDef[] {")
    lines.append("  return CATEGORY_FIELD_REQUIREMENTS[category]?.[marketplace] ?? []")
    lines.append("}")
    lines.append("")
    lines.append("/** Get only required fields for a category + marketplace */")
    lines.append("export function getRequiredFields(")
    lines.append("  category: string,")
    lines.append("  marketplace: 'ebay' | 'vinted'")
    lines.append("): CategoryFieldDef[] {")
    lines.append("  return getCategoryFields(category, marketplace).filter(f => f.required)")
    lines.append("}")
    lines.append("")

    with open(out_path, "w") as f:
        f.write("\n".join(lines) + "\n")


# === Main ===

def main():
    print("=== Building Wrenlist Category Data (Phase 3) ===\n")

    # Load source data
    print("Loading source data...")
    with open(SRC_TREE) as f:
        crosslist_data = json.load(f)
    with open(SRC_FIELDS) as f:
        field_data = json.load(f)

    crosslist_tree = crosslist_data["tree"]
    field_sets = field_data["fieldSets"]
    cat_to_field_set = field_data["catToFieldSet"]

    print(f"  Crosslist tree: {len(crosslist_tree)} top-levels")
    print(f"  Field sets: {len(field_sets)} unique")
    print(f"  Cat→FieldSet mappings: {len(cat_to_field_set)}")

    # Step 1: Build expanded tree
    print("\nBuilding expanded tree (L2/L3 hybrid, threshold={})...".format(LEAF_THRESHOLD))
    tree, uuid_map, stats = build_expanded_tree(crosslist_tree)
    print(f"  Top-levels: {stats['top_levels']}")
    print(f"  Canonical leaves: {stats['leaves']}")
    print(f"  Source UUIDs mapped: {stats['uuids_mapped']}")

    # Print per-top-level breakdown
    print("\n  Per top-level:")
    for top_slug in sorted(tree.keys()):
        count = len(tree[top_slug])
        print(f"    {top_slug}: {count} leaves")

    # Step 2: Build field requirements
    print("\nBuilding field requirements...")
    requirements = build_field_requirements(uuid_map, cat_to_field_set, field_sets)
    cats_with_fields = len(requirements)
    ebay_cats = sum(1 for r in requirements.values() if "ebay" in r)
    vinted_cats = sum(1 for r in requirements.values() if "vinted" in r)
    print(f"  Categories with field data: {cats_with_fields}")
    print(f"  With eBay fields: {ebay_cats}")
    print(f"  With Vinted fields: {vinted_cats}")

    # Count required fields
    total_req = 0
    for req in requirements.values():
        for mp_fields in req.values():
            total_req += sum(1 for f in mp_fields if f["required"])
    print(f"  Total required field entries: {total_req}")

    # Step 3: Write output files
    print(f"\nWriting outputs...")

    write_tree_ts(tree, OUT_TREE)
    print(f"  {OUT_TREE}")

    write_field_requirements_ts(requirements, OUT_FIELDS)
    print(f"  {OUT_FIELDS}")

    with open(OUT_UUID_MAP, "w") as f:
        json.dump(uuid_map, f, indent=2)
    print(f"  {OUT_UUID_MAP}")

    print("\nDone!")


if __name__ == "__main__":
    main()
