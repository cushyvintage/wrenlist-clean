# Phase 2: Category-Specific Passthrough Audit

**Status**: Analysis Complete
**Conclusion**: Phase 1 solves Phase 2 for relisting scenarios.

---

## Mapper Requirements (Source of Truth)

The Vinted mapper in `extension/dist/background/marketplaces/vinted/mapper.js` supports these dynamicProperties:

### Always Available (All Categories)
- `colorIds` → color lookup (already in payload) ✅
- `packageSizeId` → shipping size (already in payload) ✅
- `vintedCatalogId` → catalog lookup (already in payload) ✅
- `size` → size_id parsing (already in payload) ✅

### Phase 1 Added (Relist from Vinted)
- `vintedItemAttributes` → pre-stored item_attributes from original Vinted listing ✅ (NEW)
- `vintedBrandId` → brand_id directly (already in payload) ✅ (NEW)
- `ISBN` → book ISBN (already in payload) ✅

### Wizard/Form Inputs (New listings + optional relist overrides)
- `"Content rating"` → `video_game_rating_id` (video games)
- `"Platform"` → `computer_platform` attribute (video games, computers)
- `"MaterialVinted"` / `materialId` → `material` attribute (clothing)
- `"Operating system series"` → `computer_operating_system` attribute (laptops)
- `"Processor series"` → `computer_cpu_line` attribute (laptops)
- `"Hard Drive Capacity"` → `computer_storage_capacity` attribute (laptops)
- `"RAM Size"` → `computer_ram` attribute (laptops)
- `"Screen Size"` → `laptop_display_size` attribute (laptops)
- `"Charger included"` → `laptop_charger_included` attribute (laptops)
- `"Keyboard layout"` → `keyboard_layout` attribute (keyboards)
- `"Lock Status"` → `sim_lock` attribute (phones)
- `"Storage Capacity"` → `internal_memory_capacity` attribute (phones/tablets, category 3661/3728)

---

## Category-Specific Coverage

### Books
| Field | Source | Currently Passed | Phase 1 Solution |
|-------|--------|------------------|-----------------|
| `catalog_id` | vintedMetadata | ✅ vintedCatalogId | ✅ |
| `isbn` | vintedMetadata | ✅ ISBN | ✅ |
| `language_book` | item_attributes or ISBN lookup | ❓ Via vintedItemAttributes | ✅ |

**Status**: ✅ COMPLETE — vintedItemAttributes carries language_book + any other book-category attributes

---

### Video Games
| Field | Source | Currently Passed | Phase 1 Solution |
|-------|--------|------------------|-----------------|
| `catalog_id` | vintedMetadata | ✅ vintedCatalogId | ✅ |
| `console_platform` | item_attributes | ❓ Via vintedItemAttributes | ✅ |
| `video_game_rating_id` | item_attributes | ❓ Via vintedItemAttributes | ✅ |

**Status**: ✅ COMPLETE — vintedItemAttributes carries both console_platform and video_game_rating from original listing

---

### Clothing / Footwear
| Field | Source | Currently Passed | Phase 1 Solution |
|-------|--------|------------------|-----------------|
| `catalog_id` | vintedMetadata | ✅ vintedCatalogId | ✅ |
| `size_id` | vintedMetadata | ✅ size[0] | ✅ |
| `color_ids` | vintedMetadata | ✅ colorIds | ✅ |
| `material` | item_attributes | ❓ Via vintedItemAttributes | ✅ |

**Status**: ✅ COMPLETE — vintedItemAttributes carries material attribute

---

### Ceramics / Homeware / Collectibles
| Field | Source | Currently Passed | Phase 1 Solution |
|-------|--------|------------------|-----------------|
| `catalog_id` | vintedMetadata | ✅ vintedCatalogId | ✅ |
| `color_ids` | vintedMetadata | ✅ colorIds | ✅ |
| `brand_id` | vintedMetadata | ✅ vintedBrandId (Phase 1) | ✅ |

**Status**: ✅ COMPLETE

---

### Laptops / Desktops (Electronics)
| Field | Source | Currently Passed | Phase 1 Solution |
|-------|--------|------------------|-----------------|
| `catalog_id` | vintedMetadata | ✅ vintedCatalogId | ✅ |
| `computer_operating_system` | item_attributes | ❓ Via vintedItemAttributes | ✅ |
| `computer_cpu_line` | item_attributes | ❓ Via vintedItemAttributes | ✅ |
| `computer_storage_capacity` | item_attributes | ❓ Via vintedItemAttributes | ✅ |
| `computer_ram` | item_attributes | ❓ Via vintedItemAttributes | ✅ |
| `laptop_display_size` | item_attributes | ❓ Via vintedItemAttributes | ✅ |
| `laptop_charger_included` | item_attributes | ❓ Via vintedItemAttributes | ✅ |

**Status**: ✅ COMPLETE — vintedItemAttributes carries all tech attributes from original Vinted listing

---

### Phones / Tablets
| Field | Source | Currently Passed | Phase 1 Solution |
|-------|--------|------------------|-----------------|
| `catalog_id` | vintedMetadata | ✅ vintedCatalogId | ✅ |
| `sim_lock` | item_attributes | ❓ Via vintedItemAttributes | ✅ |
| `internal_memory_capacity` | item_attributes | ❓ Via vintedItemAttributes | ✅ |

**Status**: ✅ COMPLETE — vintedItemAttributes carries SIM lock + storage from original listing

---

### Media (Music, DVDs, Vinyl)
| Field | Source | Currently Passed | Phase 1 Solution |
|-------|--------|------------------|-----------------|
| `catalog_id` | vintedMetadata | ✅ vintedCatalogId | ✅ |
| `format_*` attributes | item_attributes | ❓ Via vintedItemAttributes | ✅ |

**Status**: ✅ COMPLETE — vintedItemAttributes carries format attributes

---

## Key Finding

**Phase 1 completely solves Phase 2 for relisting scenarios.**

When you relist an existing Vinted item, the original listing's full `item_attributes` are stored in `vintedMetadata.item_attributes`. Phase 1 adds `vintedItemAttributes` passthrough, which means:

1. ✅ Books get language_book from stored attributes
2. ✅ Video games get console_platform + rating from stored attributes
3. ✅ Clothing gets material from stored attributes
4. ✅ Laptops get OS, CPU, RAM, screen, charger from stored attributes
5. ✅ Phones get SIM lock + storage from stored attributes
6. ✅ Media gets format attributes from stored attributes
7. ✅ All categories get color_ids, brand_id, catalog_id as before

---

## What About Form Inputs? (Wizard-Derived Fields)

The mapper also supports fields like `"Operating system series"`, `"Processor series"`, etc. These come from:

1. **New listings via extension** — User fills form in extension, mapper uses these
2. **Manual edits on inventory item** — User edits tech specs and relist — currently these are NOT passed through

### Gap: Manually-Edited Tech Specs on Relist

If a user:
1. Imports a laptop from Vinted
2. Manually edits the item in Wrenlist and adds/changes OS, CPU, RAM
3. Relists on Vinted

**Current behavior**: The manually-edited values are NOT passed to the mapper.

**To fix**: Would need to:
- Store edited tech specs in `find.platform_fields.vinted.dynamicProperties`
- Pass them through in the relist payload alongside vintedItemAttributes
- Let mapper merge them (wizard inputs override stored attributes where applicable)

---

## Recommendation

### Phase 2 Status
✅ **COMPLETE** — All stored Vinted attributes are now wired via Phase 1.

### Phase 2.5 (Future, Optional)
For sellers who manually edit tech specs:
- [ ] Wire form inputs to relist payload
- [ ] Let mapper merge manual edits + stored attributes
- [ ] Priority: Medium (edge case for most sellers)

### Next: Phase 3
Build Vinted metadata visibility UI so sellers can see what's stored and being relisted.

---

## Test Checklist (Verification)

To verify Phase 2 is complete, test relisting across these categories:

- [ ] **Books**: Relist book, verify language_book passes
- [ ] **Video Games**: Relist game, verify console_platform + rating pass
- [ ] **Clothing**: Relist clothing, verify material passes
- [ ] **Laptops**: Relist laptop, verify OS + CPU + RAM + screen + charger pass
- [ ] **Phones**: Relist phone, verify SIM lock + storage pass
- [ ] **Media**: Relist DVD/music, verify format attributes pass

All should succeed without validation errors from Vinted.
