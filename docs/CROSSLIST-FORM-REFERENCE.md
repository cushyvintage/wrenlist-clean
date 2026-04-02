# Crosslist Form Reference
**Observed**: 2026-04-02 — live session, eBay + Vinted selected

## Key Insight
The form fields are driven by **which marketplaces are selected**, NOT by category.
Selecting eBay + Vinted adds Vinted-specific fields to the shared form. Category is a single canonical picker.

---

## Form Layout

### Left panel — Marketplace selector
Checkboxes: Poshmark, Mercari, eBay, Depop, Facebook, Etsy, Vinted, Grailed, Shopify, Whatnot, Starluv

### Centre — Main form (with eBay + Vinted selected)

**Photos**
- Drag/drop, multiple

**Title**
- Text, 0/80 chars (eBay limit drives this when eBay selected; 255 when Vinted only)

**Description**
- Textarea, 0/2000

**Category**
- Single combobox — "Select or search a category"
- Crosslist canonical categories (not platform-specific):
  - Antiques, Art, Baby & toddler, Books movies & music, Clothing shoes & accessories,
    Craft supplies, Collectibles, Electronics, Health & beauty, Home & garden,
    Musical instruments, Pet supplies, Sports & outdoors, Toys & games,
    Vehicles & parts, Other
- Maps to platform IDs on submit (not exposed to user)

**Price**
- Single price field (£)
- "Adjust prices per marketplace" button for overrides
- Accept offers toggle (eBay)
- Is auction toggle (eBay)

**Brand**
- Searchable combobox — "Leave blank if unsure / no brand"

**Condition**
- Dropdown: standard conditions

**Quantity**
- Number + "pcs"

**Primary color** ← appears when Vinted selected
- Dropdown

**Secondary color** ← appears when Vinted selected  
- Dropdown (Optional)

**Condition description** ← appears when Vinted selected
- Textarea (Optional)

**Vinted material** ← appears when Vinted selected
- Multi-select combobox, up to 3 values (Optional)

**Shipping**
- Shipping weight (lb + oz)
- Package dimensions (l x w x h in inches)
- "Set shipping profiles" link

### Right panel — Internal fields
- Add label
- SKU (optional)
- Cost of goods (£, optional)
- Internal note (textarea)

### Action bar (bottom)
- Go back to overview
- Delist everywhere | Save | Post

---

## What We Clone

### Canonical form fields (always shown):
1. Photos (drag/drop, multiple)
2. Title (text, char counter)
3. Description (textarea, char counter)
4. Category (single Wrenlist canonical picker)
5. Price (£) + per-marketplace price override
6. Brand (searchable)
7. Condition (dropdown)
8. Quantity (number)

### Vinted-only fields (shown when Vinted toggled):
9. Primary colour (dropdown)
10. Secondary colour (dropdown, optional)
11. Condition description (textarea, optional)
12. Vinted material (multi-select up to 3, optional)

### eBay-only fields (shown when eBay toggled):
13. Accept offers (toggle)
14. Is auction (toggle)

### Internal / right panel (always shown):
15. SKU (optional)
16. Cost of goods (optional)
17. Internal note (optional)

### Shipping (always shown):
18. Shipping weight
19. Package dimensions

---

## What We Don't Clone
- Multi-marketplace support beyond Vinted + eBay (Poshmark, Depop, etc.)
- AI generate button (Phase 2)
- Label system (Phase 2)
- Bulk delist/post

---

## Wrenlist Additions (not in Crosslist)
- Find price / cost price split (we buy to resell)
- WrenAI pricing suggestion
- Template selector
- SKU auto-generation
