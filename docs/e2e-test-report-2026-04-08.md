# E2E Test Report: Add-Find Form
**Date:** 2026-04-08
**Tester:** Automated scheduled task
**Environment:** https://app.wrenlist.com (production)

---

## Summary

| Test | Result | Notes |
|------|--------|-------|
| Vinted draft save (colour/material/size) | ✅ PASS | All DB fields correct |
| eBay draft save (title limit, toggles) | ⚠️ PARTIAL | Title limit correct; acceptOffers/auction NOT saved to DB |
| Etsy draft save (whoMade/whenMade/tags) | ✅ PASS | All DB fields correct |
| Depop draft save (source/age/style) | ✅ PASS | All DB fields correct |
| Brand typeahead | ✅ PASS | "Burb" → "Burberry" dropdown works |
| Size picker type switch | ✅ PASS | M clears when switching to UK sizes |
| Description over-limit warning | ✅ PASS | "1500/1000 — will be truncated on some platforms" |
| Material deselect | ✅ PASS | 3 → 2 works correctly |

---

## Bugs Found

### BUG 1 (Critical): eBay `acceptOffers` and `auction` not persisted to DB
**Severity:** High
**Component:** `add-find` form → Save draft
**Symptom:** After selecting eBay only, filling title + condition description + toggling Accept Offers and Auction, saving draft produces `platform_fields` with no `ebay` key at all. Only `shared.conditionDescription` is saved.

**Expected DB:**
```json
{
  "ebay": {
    "acceptOffers": true,
    "auction": true,
    "conditionDescription": "..."
  }
}
```

**Actual DB:**
```json
{
  "shared": {
    "conditionDescription": "Minor wear on hem..."
  }
}
```

**Repro:** Select eBay only → Clothing > Women's dresses → toggle Accept Offers ON → Save draft → check `platform_fields` in DB.

---

### BUG 2 (High): eBay acceptOffers and auction toggles default to `true`
**Severity:** Medium
**Component:** Add-find form, eBay section
**Symptom:** When eBay is selected and a category is chosen, both "Accept offers" and "Auction listing" checkboxes are pre-checked. For a fresh listing they should default to `false`.

**Impact:** Every eBay listing would unknowingly default to accepting offers and being listed as auction.

---

### BUG 3 (High): Vinted pre-selected by default on every new add-find form
**Severity:** Medium
**Component:** Add-find form, marketplace selector
**Symptom:** Every time `/add-find` is navigated to, Vinted is already selected. When user selects a second marketplace (e.g. eBay) without noticing, both get saved.

**Evidence:** Test 2 (eBay only) saved with `selected_marketplaces: ["vinted", "ebay"]` because Vinted was silently pre-selected. User intent was eBay-only.

**Note:** This may be intentional (Vinted as default for cushyvintage workflow), but it caused the eBay-only test to silently include Vinted. If intentional, the UI should make it clearer.

---

### BUG 4 (Low): Rapid chip clicks only register some selections
**Severity:** Low
**Component:** Material chip picker, Source chip picker
**Symptom:** Clicking multiple chip buttons in rapid succession (without waiting ~1 second between clicks) only registers the last selection. The intermediate clicks appear to toggle and cancel each other.

**Repro:** Click Cotton, Silk, Leather chips in quick succession → only the last-clicked chip is selected.

**Workaround:** Click each chip, wait ~1s, click next.

---

## Passing Tests Detail

### Test 1: Vinted draft — PASS
- Find ID: `6967adc3-2cf8-4d0a-8aa7-fb3cbe11f79f`
- `colour = "Blue"` ✅
- `vinted.primaryColor = 12` ✅ (correct Vinted colour ID for Blue)
- `shared.vintedSizeId = "209"` ✅ (correct Vinted size ID for M in Women's dresses)
- `vinted.material = [3, 1, 8]` ✅ (Silk=3, Cotton=1, Leather=8)
- `selected_marketplaces = ["vinted"]` ✅
- Title counter: `0/100` ✅

### Test 3: Etsy draft — PASS
- Find ID: `8e4fc4f1-ccdd-4308-8e20-c22276bd2ee8`
- Title counter: `36/140` ✅
- Description counter: `0/12000` ✅
- `shared.whoMade = "someone_else"` ✅
- `shared.whenMade = "1970s"` ✅
- `shared.tags = "vintage, retro"` ✅
- `selected_marketplaces = ["etsy"]` ✅

### Test 4: Depop draft — PASS
- Find ID: `80a0ae15-82c1-4956-a249-d1760921951d`
- Title counter: `46/255` ✅
- Description counter: `0/1000` ✅
- `shared.depopSource = "vintage,preloved"` ✅
- `shared.depopAge = "70s"` ✅
- `shared.depopStyleTags = "Retro,Boho"` ✅
- `selected_marketplaces = ["depop"]` ✅

---

## Not Tested (Requires Live Browser Session)

- **AI auto-fill**: Requires photo upload — skipped (no test images available without manual interaction)
- **Template apply**: Requires pre-existing saved template — skipped
- **Platform switching mid-form**: Colour text crossover when adding eBay after Vinted — skipped (complex state test)
- **Publish tests**: Require Chrome extension active and marketplace auth — skipped (automated run)

---

## Cleanup Required

The following test draft finds were created and should be deleted manually:

| Name | Find ID |
|------|---------|
| Test Vinted Dress - Blue Cotton M | `6967adc3-2cf8-4d0a-8aa7-fb3cbe11f79f` |
| Test eBay Item - Accept Offers Enabled | `1f746b88-cd66-44c4-8b64-aa5ae86e5857` |
| Test Etsy Item - Vintage 1970s Dress | `8e4fc4f1-ccdd-4308-8e20-c22276bd2ee8` |
| Test Depop Item - 70s Vintage Retro Boho Dress | `80a0ae15-82c1-4956-a249-d1760921951d` |
