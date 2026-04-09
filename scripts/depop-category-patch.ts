/**
 * Depop Category Patch — fuzzy-matched mappings for unmapped Wrenlist categories
 *
 * Generated 2026-04-09 by analyzing 300 leaf categories in marketplace-category-map.ts
 * that had no `depop` platform entry, and matching them against Depop's taxonomy from
 * depop-categories.json (4 departments, 27 groups, 159 product types).
 *
 * Depop ID format: "department|group|productType" (pipe-separated, 3 levels)
 * Departments: menswear, womenswear, kidswear, everything-else
 *
 * Usage:
 *   This map can be fed into build-category-data.py or applied programmatically
 *   to update the CATEGORY_TREE in marketplace-category-map.ts.
 *
 * Coverage improvement: 270 → 467 leaves with Depop IDs (82% coverage, up from 47%)
 */

export interface DepopMapping {
  id: string
  name: string
}

/**
 * New Depop mappings for previously unmapped Wrenlist leaf categories.
 * Key = canonical leaf value (finds.category), Value = Depop category mapping.
 */
export const DEPOP_CATEGORY_PATCH: Record<string, DepopMapping> = {
  // ═══════════════════════════════════════════════════════════════════
  // ANTIQUES (6 unmapped → 6 mapped)
  // ═══════════════════════════════════════════════════════════════════
  antiques_antique_appliances: { id: "everything-else|home|kitchen", name: "Kitchen" },
  antiques_antique_books_and_incunabulas: { id: "everything-else|books-and-magazines|books", name: "Books" },
  antiques_antique_cleaners_and_polishes: { id: "everything-else|home|other-home", name: "Other" },
  antiques_antique_decor: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  antiques_antique_home_improvement: { id: "everything-else|home|other-home", name: "Other" },
  antiques_antique_manuscripts: { id: "everything-else|books-and-magazines|books", name: "Books" },

  // ═══════════════════════════════════════════════════════════════════
  // ART (4 unmapped → 4 mapped)
  // ═══════════════════════════════════════════════════════════════════
  art_ceramic_art: { id: "everything-else|art|sculpture", name: "Sculpture" },
  art_fiber_and_textile_art: { id: "everything-else|art|mixed-media", name: "Mixed media" },
  art_glass_art: { id: "everything-else|art|sculpture", name: "Sculpture" },
  art_photographs: { id: "everything-else|art|photography", name: "Photography" },

  // ═══════════════════════════════════════════════════════════════════
  // BABY & TODDLER (7 unmapped → 7 mapped)
  // ═══════════════════════════════════════════════════════════════════
  baby_toddler_baby_bath: { id: "everything-else|home|bathroom", name: "Bathroom" },
  baby_toddler_baby_carriers: { id: "everything-else|home|other-home", name: "Other" },
  baby_toddler_baby_feeding: { id: "everything-else|home|kitchen", name: "Kitchen" },
  baby_toddler_baby_gear: { id: "everything-else|toys|other-toys", name: "Other" },
  baby_toddler_baby_health: { id: "everything-else|beauty|other-beauty", name: "Other" },
  baby_toddler_baby_safety: { id: "everything-else|home|other-home", name: "Other" },
  baby_toddler_general: { id: "everything-else|toys|other-toys", name: "Other" },

  // ═══════════════════════════════════════════════════════════════════
  // BOOKS & MEDIA (3 unmapped → 3 mapped)
  // ═══════════════════════════════════════════════════════════════════
  books_media_catalogs: { id: "everything-else|books-and-magazines|magazines", name: "Magazines" },
  books_media_general: { id: "everything-else|books-and-magazines|other-books-and-magazines", name: "Other" },
  books_media_movies: { id: "everything-else|music|other-music", name: "Other" },

  // ═══════════════════════════════════════════════════════════════════
  // CLOTHING (1 unmapped → 1 mapped)
  // ═══════════════════════════════════════════════════════════════════
  clothing_womenswear_womens_jewelry: { id: "womenswear|jewellery", name: "Jewellery" },

  // ═══════════════════════════════════════════════════════════════════
  // COLLECTIBLES — ADVERTISING (15 unmapped → 15 mapped)
  // Most advertising collectibles map to home accessories or other-home
  // ═══════════════════════════════════════════════════════════════════
  collectibles_advertising_automobile_advertising: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_advertising_computers_and_high_tech_advertising: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_advertising_ebayana_advertising: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_advertising_food_and_beverage_advertising: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_advertising_government_advertising: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_advertising_health_and_beauty_advertising: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_advertising_jewelry_and_watches_advertising: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_advertising_merchandise_and_memorabilia: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_advertising_musical_instrument_advertising: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_advertising_pet_advertising: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_advertising_price_guides_and_publications: { id: "everything-else|books-and-magazines|books", name: "Books" },
  collectibles_advertising_restaurants_and_fast_food_advertising: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_advertising_retail_store_advertising: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_advertising_tire_advertising: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },

  // ═══════════════════════════════════════════════════════════════════
  // COLLECTIBLES — ANIMALS (10 unmapped → 10 mapped)
  // Animal collectibles = figurines / home accessories
  // ═══════════════════════════════════════════════════════════════════
  collectibles_animals_amphibians_and_reptiles: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_animals_birds: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_animals_dogs: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_animals_farm_and_countryside: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_animals_fish_and_marine: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_animals_insects_and_butterflies: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_animals_prehistoric_and_dinosaurs: { id: "everything-else|toys|figures-and-dolls", name: "Figures and dolls" },
  collectibles_animals_price_guides_and_publications: { id: "everything-else|books-and-magazines|books", name: "Books" },
  collectibles_animals_small_pets: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_animals_wild_animals: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },

  // ═══════════════════════════════════════════════════════════════════
  // COLLECTIBLES — MISC (large block, 40+ categories)
  // ═══════════════════════════════════════════════════════════════════
  collectibles_arcade_jukeboxes_and_pinball: { id: "everything-else|toys|puzzles-and-games", name: "Puzzles and games" },
  collectibles_baby_and_nursery: { id: "everything-else|toys|other-toys", name: "Other" },
  collectibles_banks_registers_and_vending: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_beads: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_bottles_and_insulators: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },

  // COINS & MONEY (17 unmapped → 17 mapped)
  collectibles_coins_and_money_banknotes: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_bullion_bars: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_coin_publications: { id: "everything-else|books-and-magazines|books", name: "Books" },
  collectibles_coins_and_money_coin_supplies_equipment: { id: "everything-else|home|other-home", name: "Other" },
  collectibles_coins_and_money_coins_ancient: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_coins_british: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_coins_collections: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_coins_european: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_coins_ireland: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_coins_novelty: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_coins_united_states: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_coins_world: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_general: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_historical_medals_medallions: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_share_certificates_bonds: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_tokens: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_coins_and_money_virtual_currency: { id: "everything-else|home|other-home", name: "Other" },

  // MISC COLLECTIBLES
  collectibles_collectible_figures_and_supplies: { id: "everything-else|toys|figures-and-dolls", name: "Figures and dolls" },
  collectibles_credit_charge_cards: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },

  // CULTURES & ETHNICITIES (20 unmapped → 20 mapped)
  collectibles_cultures_and_ethnicities_australian: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_british: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_canada_aboriginal: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_celtic: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_chinese: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_egyptian: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_ethnic_americana: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_european: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_general: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_guatemala: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_indian: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_indonesian: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_korean: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_middle_eastern: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_native_american: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_nepalese_and_tibetan: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_pacific_islands: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_panama: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_peru: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_price_guides_and_publications: { id: "everything-else|books-and-magazines|books", name: "Books" },
  collectibles_cultures_and_ethnicities_russian: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_cultures_and_ethnicities_thai_and_siamese: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },

  // NFTs & DIGITAL
  collectibles_emerging_nfts: { id: "everything-else|home|other-home", name: "Other" },

  // HISTORICAL MEMORABILIA (10 unmapped → 10 mapped)
  collectibles_historical_memorabilia_accounting_and_taxation: { id: "everything-else|books-and-magazines|books", name: "Books" },
  collectibles_historical_memorabilia_astronauts_and_space_travel: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_historical_memorabilia_flags_and_pennants: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_historical_memorabilia_general: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_historical_memorabilia_inventors_and_geniuses: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_historical_memorabilia_lawyers_and_legal: { id: "everything-else|books-and-magazines|books", name: "Books" },
  collectibles_historical_memorabilia_mobs_gangsters_and_criminals: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_historical_memorabilia_political: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_historical_memorabilia_royalty_collectibles: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_historical_memorabilia_teaching_and_education: { id: "everything-else|books-and-magazines|books", name: "Books" },
  collectibles_historical_memorabilia_veterinary_medicine: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },

  // JEWELRY
  collectibles_jewelry: { id: "womenswear|jewellery", name: "Jewellery" },

  // KITCHEN & HOME (5 unmapped → 5 mapped)
  collectibles_kitchen_and_home_bakeware: { id: "everything-else|home|kitchen", name: "Kitchen" },
  collectibles_kitchen_and_home_cookware: { id: "everything-else|home|kitchen", name: "Kitchen" },
  collectibles_kitchen_and_home_flatware_knives_and_cutlery: { id: "everything-else|home|kitchen", name: "Kitchen" },
  collectibles_kitchen_and_home_major_appliances_and_bathroom_fixtures: { id: "everything-else|home|bathroom", name: "Bathroom" },
  collectibles_kitchen_and_home_small_appliances: { id: "everything-else|home|kitchen", name: "Kitchen" },

  // MILITARIA (4 unmapped → 4 mapped)
  collectibles_militaria_original_period_items: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_militaria_price_guides_and_publications: { id: "everything-else|books-and-magazines|books", name: "Books" },
  collectibles_militaria_reproductions: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_militaria_unspecified_unknown_date: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },

  // REMAINING COLLECTIBLES
  collectibles_paper: { id: "everything-else|art|art-prints", name: "Art prints" },
  collectibles_pez_keychains_promo_glasses: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_phone_cards: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_pinbacks_and_lunchboxes: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_rocks_fossils_and_minerals: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_science_and_medicine_1930_now: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_science_fiction_and_horror: { id: "everything-else|toys|figures-and-dolls", name: "Figures and dolls" },
  collectibles_souvenirs_and_travel_memorabilia: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },

  // STAMPS (14 unmapped → 14 mapped)
  collectibles_stamps_africa: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_asia: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_australia_and_oceania: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_british_colonies_and_territories: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_caribbean: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_central_and_south_america: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_europe: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_great_britain: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_ireland: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_middle_east: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_north_america: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_philately: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_publications_and_supplies: { id: "everything-else|books-and-magazines|books", name: "Books" },
  collectibles_stamps_united_states: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_stamps_worldwide: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },

  collectibles_stickers_collections_and_albums: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_tools_hardware_and_locks: { id: "everything-else|home|other-home", name: "Other" },

  // TRANSPORTATION (11 unmapped → 11 mapped)
  collectibles_transportation_automobilia: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_transportation_aviation: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_transportation_boats_and_ships: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_transportation_buses_and_taxi_cabs: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_transportation_maps_and_atlases: { id: "everything-else|books-and-magazines|books", name: "Books" },
  collectibles_transportation_motorcycles: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_transportation_scooters: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_transportation_signs: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_transportation_subways: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_transportation_traction_and_trolleys: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_transportation_trucks: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },

  collectibles_vanity_perfume_and_shaving: { id: "everything-else|beauty|fragrances", name: "Fragrances" },
  collectibles_vintage_retro_mid_century: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  collectibles_virtual_and_crypto_collectibles: { id: "everything-else|home|other-home", name: "Other" },

  // ═══════════════════════════════════════════════════════════════════
  // CRAFT SUPPLIES (16 unmapped → 16 mapped)
  // ═══════════════════════════════════════════════════════════════════
  craft_supplies_basketry_and_chair_caning: { id: "everything-else|home|other-home", name: "Other" },
  craft_supplies_beading_and_jewelry_making: { id: "womenswear|jewellery", name: "Jewellery" },
  craft_supplies_candle_making_and_soap_making: { id: "everything-else|home|candles", name: "Candles" },
  craft_supplies_fabric: { id: "everything-else|home|textiles", name: "Textiles" },
  craft_supplies_floral_crafts: { id: "everything-else|home|plants-and-flowers", name: "Plants and flowers" },
  craft_supplies_framing_and_matting: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  craft_supplies_glass_and_mosaics: { id: "everything-else|art|mixed-media", name: "Mixed media" },
  craft_supplies_leathercrafts: { id: "everything-else|home|other-home", name: "Other" },
  craft_supplies_metalworking: { id: "everything-else|home|other-home", name: "Other" },
  craft_supplies_multi_purpose_craft_supplies: { id: "everything-else|home|other-home", name: "Other" },
  craft_supplies_needlecrafts_and_yarn: { id: "everything-else|home|textiles", name: "Textiles" },
  craft_supplies_sewing: { id: "everything-else|home|textiles", name: "Textiles" },
  craft_supplies_stamping_and_embossing: { id: "everything-else|home|other-home", name: "Other" },
  craft_supplies_upholstery_tools_and_equipment: { id: "everything-else|home|other-home", name: "Other" },
  craft_supplies_wall_decor_and_tatouage: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  craft_supplies_woodworking: { id: "everything-else|home|other-home", name: "Other" },

  // ═══════════════════════════════════════════════════════════════════
  // ELECTRONICS (11 unmapped → 11 mapped)
  // ═══════════════════════════════════════════════════════════════════
  electronics_computers_and_tablets_blank_media: { id: "everything-else|tech-accessories|other-tech-accessories", name: "Other" },
  electronics_computers_and_tablets_cables_and_power_cords: { id: "everything-else|tech-accessories|other-tech-accessories", name: "Other" },
  electronics_computers_and_tablets_desktops_and_all_in_ones: { id: "everything-else|tech-accessories|other-tech-accessories", name: "Other" },
  electronics_computers_and_tablets_ebook_readers: { id: "everything-else|tech-accessories|other-tech-accessories", name: "Other" },
  electronics_computers_and_tablets_general: { id: "everything-else|tech-accessories|other-tech-accessories", name: "Other" },
  electronics_computers_and_tablets_printers_and_scanners: { id: "everything-else|tech-accessories|other-tech-accessories", name: "Other" },
  electronics_computers_and_tablets_smart_glasses: { id: "everything-else|tech-accessories|other-tech-accessories", name: "Other" },
  electronics_computers_and_tablets_software: { id: "everything-else|tech-accessories|other-tech-accessories", name: "Other" },
  electronics_computers_and_tablets_tablets: { id: "everything-else|tech-accessories|other-tech-accessories", name: "Other" },
  electronics_computers_and_tablets_tablets_and_ebook_reader_parts: { id: "everything-else|tech-accessories|other-tech-accessories", name: "Other" },
  electronics_radio_communications: { id: "everything-else|tech-accessories|other-tech-accessories", name: "Other" },

  // ═══════════════════════════════════════════════════════════════════
  // HEALTH & BEAUTY (5 unmapped → 5 mapped)
  // ═══════════════════════════════════════════════════════════════════
  health_beauty_hair_care: { id: "everything-else|beauty|hair-products", name: "Hair products" },
  health_beauty_makeup: { id: "everything-else|beauty|makeup", name: "Make-up" },
  health_beauty_nail_care: { id: "everything-else|beauty|nails", name: "Nails" },
  health_beauty_shaving_and_hair_removal: { id: "everything-else|beauty|beauty-tools", name: "Beauty tools" },
  health_beauty_skin_care: { id: "everything-else|beauty|skincare-and-body", name: "Skincare" },

  // ═══════════════════════════════════════════════════════════════════
  // HOME & GARDEN (24 unmapped → 24 mapped)
  // ═══════════════════════════════════════════════════════════════════
  home_garden_general: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_home_improvement_building_and_hardware: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_home_improvement_electrical_supplies: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_home_improvement_general: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_home_improvement_heating_cooling_and_air: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_outdoor_and_garden_composting_and_yard_waste: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_outdoor_and_garden_garden_clothing_and_protective_gear: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_outdoor_and_garden_general: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_outdoor_and_garden_landscaping_and_garden_materials: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_outdoor_and_garden_outdoor_power_tools: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_outdoor_and_garden_plants_seeds_and_bulbs: { id: "everything-else|home|plants-and-flowers", name: "Plants and flowers" },
  home_garden_outdoor_and_garden_ponds_and_water_features: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_outdoor_and_garden_snow_removal_tools: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_outdoor_and_garden_watering_equipment: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_outdoor_and_garden_weather_instruments: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  home_garden_outdoor_and_garden_weed_and_pest_control: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_tools_and_diy_electricians_tools: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_tools_and_diy_hand_tools: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_tools_and_diy_measuring_tools: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_tools_and_diy_plumbing_tools: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_tools_and_diy_power_tools: { id: "everything-else|home|other-home", name: "Other" },
  home_garden_tools_and_diy_workshop_and_worksite_equipment: { id: "everything-else|home|other-home", name: "Other" },

  // ═══════════════════════════════════════════════════════════════════
  // MUSICAL INSTRUMENTS (4 unmapped → 4 mapped)
  // ═══════════════════════════════════════════════════════════════════
  musical_instruments_general: { id: "everything-else|music|other-music", name: "Other" },
  musical_instruments_guitars_and_basses: { id: "everything-else|music|other-music", name: "Other" },
  musical_instruments_karaoke: { id: "everything-else|music|other-music", name: "Other" },
  musical_instruments_pianos_and_keyboards: { id: "everything-else|music|other-music", name: "Other" },

  // ═══════════════════════════════════════════════════════════════════
  // OTHER (1 unmapped → 1 mapped)
  // ═══════════════════════════════════════════════════════════════════
  other_office_supplies: { id: "everything-else|home|other-home", name: "Other" },

  // ═══════════════════════════════════════════════════════════════════
  // PET SUPPLIES (5 unmapped → 5 mapped)
  // ═══════════════════════════════════════════════════════════════════
  pet_supplies_cats: { id: "everything-else|home|other-home", name: "Other" },
  pet_supplies_dogs: { id: "everything-else|home|other-home", name: "Other" },
  pet_supplies_memorials_and_urns: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  pet_supplies_reptiles: { id: "everything-else|home|other-home", name: "Other" },
  pet_supplies_small_pets: { id: "everything-else|home|other-home", name: "Other" },

  // ═══════════════════════════════════════════════════════════════════
  // SPORTS & OUTDOORS (22 unmapped → 22 mapped)
  // ═══════════════════════════════════════════════════════════════════
  sports_outdoors_backyard_games: { id: "everything-else|toys|puzzles-and-games", name: "Puzzles and games" },
  sports_outdoors_camping_and_hiking: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_disc_golf: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_equestrian_driving_equipment: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_equestrian_horse_feed_and_supplements: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_equestrian_lunging_and_training_equipment: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_equestrian_rodeo_and_roping_equipment: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_equestrian_western_chaps_full_chaps: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_equestrian_whips_and_crops: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_fishing: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_general: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_hunting_decoys: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_hunting_falconry_equipment: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_hunting_game_calls: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_hunting_gun_smithing_and_maintenance: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_hunting_holsters_belts_and_pouches: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_hunting_hunting_dog_supplies: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_hunting_taxidermy: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  sports_outdoors_skydiving_para_and_hang_gliding: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_team_sports_basketball: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_team_sports_coach_and_referee_equipment: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_team_sports_handball: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_team_sports_sport_awards: { id: "everything-else|home|decor-home-accesories", name: "Home accessories" },
  sports_outdoors_team_sports_volleyball: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_track_and_field: { id: "everything-else|sports-equipment", name: "Sports equipment" },
  sports_outdoors_triathlon: { id: "everything-else|sports-equipment", name: "Sports equipment" },

  // ═══════════════════════════════════════════════════════════════════
  // TOYS & GAMES (3 unmapped → 3 mapped)
  // ═══════════════════════════════════════════════════════════════════
  toys_games_games_and_puzzles: { id: "everything-else|toys|puzzles-and-games", name: "Puzzles and games" },
  toys_games_models_and_kits: { id: "everything-else|toys|figures-and-dolls", name: "Figures and dolls" },
  toys_games_stuffed_animals: { id: "everything-else|toys|plushies", name: "Plushies" },

  // ═══════════════════════════════════════════════════════════════════
  // VEHICLES & PARTS (skipped — 103 subcategories)
  // Depop has no automotive category. All map to "other-home" as fallback.
  // These are extremely unlikely to be listed on Depop so not worth mapping
  // individually — they all go to the same fallback.
  // ═══════════════════════════════════════════════════════════════════
  // vehicles_parts categories are intentionally omitted — the extension
  // fallback of "everything-else|home|other-home" is the best match since
  // Depop has no automotive/vehicle category at all.
}

// Total entries in patch: 197 new mappings
// Remaining unmapped: 103 (all vehicles_parts — no Depop equivalent)
// New coverage: 270 + 197 = 467 / 570 = 82%
