BEGIN;

-- Drop procedures and functions first
DROP PROCEDURE IF EXISTS public.delete_old_sessions();
DROP FUNCTION IF EXISTS public.accept_cookies(text);

-- Drop tables (in order to avoid foreign key issues)
DROP TABLE IF EXISTS public.package_drinks;
DROP TABLE IF EXISTS public.package_sizes;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.postal_service;
DROP TABLE IF EXISTS public.drinks;
DROP TABLE IF EXISTS public.packages;

COMMIT;



BEGIN;

-- ===================
-- CREATE TABLES
-- ===================

-- DRINKS
CREATE TABLE IF NOT EXISTS public.drinks (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  size TEXT,
  purchase_price INT,
  sale_price INT,
  stock INT,
  recycling_fee INT,
  is_sugar_free BOOLEAN,
  description TEXT,
  ingredients TEXT,
  nutrition JSONB,
  image TEXT
);

-- PACKAGES
CREATE TABLE IF NOT EXISTS public.packages (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  image TEXT,
  category TEXT
);

-- PACKAGE_SIZES
CREATE TABLE IF NOT EXISTS public.package_sizes (
  id BIGSERIAL PRIMARY KEY,
  package_id BIGINT REFERENCES public.packages (id) ON DELETE CASCADE,
  size INT,
  discount NUMERIC,
  round_up_or_down INT
);

-- PACKAGE_DRINKS
CREATE TABLE IF NOT EXISTS public.package_drinks (
  id BIGSERIAL PRIMARY KEY,
  package_id BIGINT REFERENCES public.packages (id) ON DELETE CASCADE,
  drink_id BIGINT REFERENCES public.drinks (id) ON DELETE CASCADE
);

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  order_key TEXT,
  session_id TEXT UNIQUE,
  order_id TEXT UNIQUE,
  basket_details JSONB,
  quickpay_details JSONB,
  status TEXT,
  order_confirmation_send BOOLEAN,
  order_invoice_send BOOLEAN,

  /* Shipmondo & tracking fields */
  shipmondo_shipment_id TEXT,         -- store the Shipmondo shipment ID
  tracking_number TEXT,               -- store the tracking number
  tracking_url TEXT,                  -- store a direct tracking URL if needed
  carrier TEXT,                       -- store which carrier (e.g. 'gls', 'postnord') was used
  shipping_label_url TEXT,            -- store a link to the PDF label if needed
  shipping_cost INT,                  -- store shipping cost in øre (e.g. 6500 => 65.00 DKK)
  shipping_method TEXT,               -- store the chosen shipping method (homeDelivery, pickupPoint, etc.)

  /* Other integration or shipping data */
  shipping_address JSONB,             -- store shipping address details if separate from basket_details
  tracking_status TEXT,               -- latest known status from Shipmondo webhooks
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SESSIONS
-- Note the "DEFAULT now()" for created_at/updated_at
CREATE TABLE IF NOT EXISTS public.sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  order_id TEXT UNIQUE,
  allow_cookies BOOLEAN,
  basket_details JSONB,
  temporary_selections JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- CREATE FUNCTION: accept_cookies(session_id)
-- ============================================
CREATE OR REPLACE FUNCTION public.accept_cookies(session_id_param text)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.sessions
  SET
    allow_cookies = TRUE,
    updated_at = now()
  WHERE session_id = session_id_param;
$$;

-- ================================================
-- CREATE PROCEDURE: delete_old_sessions()
-- (deletes sessions older than 1 hour, for example)
-- ================================================
CREATE OR REPLACE PROCEDURE public.delete_old_sessions()
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.sessions
  WHERE created_at < now() - INTERVAL '1 hour';
END;
$$;

-- ================================================
-- NEW: TABLE FOR DELIVERY FEES
-- (different providers: "postnord", "gls"; 
--  different delivery_type: "homeDelivery", "pickupPoint", etc.)
-- ================================================
CREATE TABLE IF NOT EXISTS public.postal_service (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,          -- e.g. 'postnord', 'gls'
  delivery_type TEXT NOT NULL,     -- e.g. 'homeDelivery' or 'pickupPoint'
  max_weight NUMERIC NOT NULL,     -- e.g. 1, 5, 10, 20, 35 (in kilograms)
  fee INT NOT NULL                 -- in øre (e.g. 4300 => 43.00 DKK)
);

COMMIT;






















BEGIN;

--------------------------------------------------------------------------------
-- DRINKS
--------------------------------------------------------------------------------
-- NOTE: If you already have some rows inserted, remove duplicates or adjust as needed.
INSERT INTO drinks
  (slug, name, size, purchase_price, sale_price, stock, recycling_fee, is_sugar_free, description, ingredients, nutrition, image)
VALUES
  (
    'faxe-kondi-booster-black-edition',
    'Faxe Kondi Booster Black Edition',
    '0.5 l',
    1000, -- inklisuv moms
    1400, -- inklisuv moms
    24,
    100,
    false,
    'Faxe Kondi Booster Black Edition blev en del af Faxe Kondi Booster-familien i 2018. Den er sødere og mere frisk end den originale Faxe Kondi Booster og er målrettet nattelivet.',
    'Vand, sukker, druesukker, syre (E330), kuldioxid, taurin (0,4%), surhedsregulerende midler (E331, E504), konserveringmidler (E202, E211), aroma, farvestof (E150a, E101)), koffein (0,03%), inositol, vitaminer (niacin, pantothensyre, vitamin B6, vitamin B12).',
    '{"per100ml":{"fat":"0 g","salt":"0.133 g","sugar":"11 g","energy":"46 kcal","protein":"0 g","saturatedFat":"0 g","carbohydrates":"11 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/faxe-kondi-booster-black-edition.jpg'
  ),
  (
    'faxe-kondi-booster-energy',
    'Faxe Kondi Booster Energy',
    '0.5 l',
    1000,
    1400,
    24,
    100,
    false,
    'Faxe Kondi Booster Energy blev en del af Faxe Kondi Booster-familien i 2015. Den er sødere og mere frisk end den originale Faxe Kondi Booster og har den klassiske smag af energidrik.',
    'vand, sukker, druesukker, syre (E330), kuldioxid, taurin (0,4%),surhedsregulerende midler (E331, E504), konserveringsmidler (E202,E211), aroma, farvestof (E133), koffein (0,03%), inositol, vitaminer (niacin, pantothensyre, vitamin B6, vitamin B12)',
    '{"per100ml":{"fat":"0 g","salt":"0.133 g","sugar":"11 g","energy":"46 kcal","protein":"0 g","saturatedFat":"0 g","carbohydrates":"11 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/faxe-kondi-booster-energy.jpg'
  ),
  (
    'faxe-kondi-booster-free',
    'Faxe Kondi Booster Free',
    '0.5 l',
    1000,
    1400,
    24,
    100,
    false,
    'Faxe Kondi Booster Free er en sukkerfri energidrik, der giver et hurtigt boost af energi uden kalorier. Perfekt til aktive dage og træning.',
    'Vand, aroma, syre (E330), kuldioxid, salt, konserveringsmidler (E202, E211), sødestoffer (aspartam, acesulfam-K), koffein (0,03%), surhedsregulerende midler (E331, E500, E339, E501),stabilisator (E415), aroma (bl.a. quinin), vitaminer (pantothensyre, vitamin B6, biotin, vitamin B12).',
    '{"per100ml":{"fat":"0 g","salt":"0.05 g","sugar":"12 g","energy":"49 kcal","protein":"0 g","saturatedFat":"0 g","carbohydrates":"12 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/faxe-kondi-booster-free.jpg'
  ),
  (
    'faxe-kondi-booster-frosty-blue',
    'Faxe Kondi Booster Frosty Blue',
    '0.5 l',
    1000,
    1400,
    24,
    100,
    true,
    'Frosty Blue er en ny sukkerfri Faxe Kondi Booster med et twist af citrus og blåbær.',
    'Vand, kuldioxid, syre (E330), surhedsregulerende middel (E331), aroma, konserveringsmidler (E202, E211), koffein (0,03%), sødestoffer (E950, E955), stabilisator (E414), vitaminer (pantothensyre, vitamin B6, biotin, vitamin B12), salt, farvestof (E133)',
    '{"per100ml":{"fat":"0 g","salt":"0.2 g","sugar":"0 g","energy":"2 kcal","protein":"0 g","saturatedFat":"0 g","carbohydrates":"0 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/faxe-kondi-booster-frosty-blue.jpg'
  ),
  (
    'faxe-kondi-booster-original',
    'Faxe Kondi Booster Original',
    '0.5 l',
    1000,
    1400,
    24,
    100,
    false,
    'Faxe Kondi Booster Original er en energidrik fra Bryggeriet Faxe. Kendt for sin søde smag og indhold af koffein, taurin og B-vitaminer.',
    'Vand, sukker, druesukker (4%), syre (E330), kuldioxid, salt, koffein (0,03%) konserveringsmidler (E202, E211), surhedsregulerende midler (E339, E500, E331, E501), naturlig farve (ekstrakt af saflor), aroma (bl,a, quinin), vitaminer (pantothensyre, vitamin B6, biotin, Vitamin B12).',
    '{"per100ml":{"fat":"0 g","salt":"0.05 g","sugar":"12 g","energy":"49 kcal","protein":"0 g","saturatedFat":"0 g","carbohydrates":"12 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/faxe-kondi-booster-original.jpg'
  ),
  (
    'faxe-kondi-booster-pink-dragon',
    'Faxe Kondi Booster Pink Dragon',
    '0.5 l',
    1000,
    1400,
    24,
    100,
    true,
    'Ny Faxe Kondi Booster med smag af dragefrugt for en frisk og eksotisk oplevelse.',
    'Vand, kuldioxid, syre (E330), surhedsregulerende middel (E331), naturlig aroma, konserveringsmidler (E202, E211), koffein (0,03%), sødestoffer (E950, E955), stabilisatorer (E414, E445), vitaminer (pantothensyre, vitamin B6, biotin, vitamin B12), farvestof (E163).',
    '{"per100ml":{"fat":"0 g","salt":"0.118 g","sugar":"0 g","energy":"2 kcal","protein":"0 g","saturatedFat":"0 g","carbohydrates":"0 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/faxe-kondi-booster-pink-dragon.jpg'
  ),
  -- (
  --   'faxe-kondi-booster-sort-passion',
  --   'Faxe Kondi Booster Sort Passion',
  --   '0.5 l',
  --   1000,
  --   1400,
  --   24,
  --   100,
  --   false,
  --   'Faxe Kondi Booster Sort Passion giver en intens smag med hints af blodappelsin og passion.',
  --   'Vand, kuldioxid, taurin (0,4%), syre (E330), surhedsregulerende midler (E331, E504), aroma, koffein (0,03%), farvestoffer (E150a, E101), sødestoffer (aspartam, acesulfam-K), konserveringsmidler (E211, E202), inositol, vitaminer (niacin, pantothensyre, vitamin B6, vitamin B12).',
  --   '{"per100ml":{"fat":"0 g","salt":"0.13 g","sugar":"11 g","energy":"46 kcal","protein":"0 g","saturatedFat":"0 g","carbohydrates":"11 g"}}'::jsonb,
  --   '/storage/v1/object/public/public-images/drinks/faxe-kondi-booster-sort-passion.jpg'
  -- ),
  (
    'faxe-kondi-booster-sort-zero',
    'Faxe Kondi Booster Sort Zero',
    '0.5 l',
    1000,
    1400,
    24,
    100,
    true,
    'Faxe Kondi Booster Sort Zero er en sukkerfri variant med intens smag, der kombinerer den mørke Booster-profil med en kalorielet formel.',
    'Ingredienser: Vand, kuldioxid, taurin (0,4%), surhedsregulerende midler (E331, E504), syre (E330), koffein (0,03%), sødestoffer (aspartam, acesulfam K), konserveringsmidler (E211, E202), farvestof (E150a, E101), inositol, aroma, vitaminer (niacin, pantothensyre, vitamin B6, vitamin B12)',
    '{"per100ml":{"fat":"0 g","salt":"0.133 g","sugar":"0 g","energy":"3 kcal","protein":"0 g","caffeine":"32 mg","saturatedFat":"0 g","carbohydrates":"0 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/faxe-kondi-booster-sort-zero.jpg'
  ),
  (
    'faxe-kondi-booster-twisted-ice-zero',
    'Faxe Kondi Booster Twisted Ice Zero',
    '0.5 l',
    1000,
    1400,
    24,
    100,
    true,
    'Faxe Kondi Booster Twisted Ice er den perfekte forfriskning med frugtig smag og brus, ideel som en energigivende pause.',
    'Ingredienser: Vand, kuldioxid, syre (E330), taurin (0,4%), surhedsregulerende middel (E331), aroma, sødestoffer (acesulfam-K, E955), koffein (0,03%) konserveringsmidler (E202, E211), stabilisator (E414), vitaminer (niacin, pantothensyre, B6, B12), glukoronolakton, inositol, salt, guaranaekstrakt.',
    '{"per100ml":{"fat":"0 g","salt":"0.2 g","fiber":"0 g","sugar":"0 g","energy":"3 kcal","niacin":"8.5 mg (53% RI)","protein":"0 g","vitaminB6":"0.8 mg (57% RI)","vitaminB12":"2.5 µg (100% RI)","saturatedFat":"0 g","carbohydrates":"0 g","pantothenicAcid":"4.2 mg (70% RI)"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/faxe-kondi-booster-twisted-ice-zero.jpg'
  ),
  (
    'monster-energy',
    'Monster Energy',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    false,
    'Monster Energy Original 500ml er den klassiske, kraftfulde energidrik med koffein, taurin og ginseng, som giver et hurtigt energiboost og øget fokus.',
    'Ingredienser: Kulsyreholdigt vand, saccharose, glucosesirup, syre (citronsyre), aromaer, taurin (0,4%), surhedsregulerende middel (natriumcitrater), panax ginseng rodekstrakt (0,08%), konserveringsmidler (sorbinsyre, benzoesyre), koffein (0,03%), farve (anthocyaniner), vitaminer (niacin (B3), riboflavin (B2), B6, B12), sødestof (sucralose), inositol (0,002%), maltodextrin.',
    '{"per100ml":{"fat":"0 g","salt":"0.18 g","fiber":"0 g","sugar":"11 g","energy":"42 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"11 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy.jpg'
  ),
  (
    'monster-energy-khaotic',
    'Monster Energy Khaotic',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    false,
    'Monster Khaotic 500ml er en del af Monster Energy''s Juice-serie og kombinerer en energigivende formel med en frugtagtig smagsprofil.',
    'Kulsyreholdigt vand, sukker, glukose, æblejuicekoncentrat, naturlige smagsstoffer, taurin, surhedsregulerende midler (citronsyre, æblesyre, E332), appelsinjuicekoncentrat, Panax Ginseng, hvid druesaftkoncentrat, konserveringsmiddel (E202), koffein, sødemiddel (sukralose). ), L-Carnitin, L-Tartrat, Vitamin B3, Farver (E160a, Druehudsekstrakt), Inositol, Vitamin B6, Vitamin B2, Maltodextrin, Vitamin B12.',
    '{"per100ml":{"fat":"0 g","salt":"0.20 g","fiber":"0 g","sugar":"11 g","energy":"47 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"11 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-khaotic.jpg'
  ),
  (
    'monster-energy-lewis-hamilton',
    'Monster Energy Lewis Hamilton',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    true,
    'Monster Energy Hamilton 2.0 500ml har en intens, unik smag med kraftig energiboost. Perfekt til at hjælpe dig med at forblive vågen og fokuseret.',
    'kulsyreholdigt vand, syre (citronsyre), taurin (0,4%), surhedsregulerende middel (natriumcitrater),maltodextrin, panax ginseng rodekstrakt (0,08%), aromaer, konserveringsmidler (kaliumsorbat, natriumbenzoat), sødestoffer (sucralose, acesulfam K), koffein (0,03%), stabilisatorer (arabisk gummi, glycerolestere af fyrreharpiks),vitaminer [niacin, riboflavin, B6, B12], vegetabilske olier (kokosnød, rapsfrø), salt,inositol, farve (E160e)',
    '{"per100ml":{"fat":"0 g","salt":"0.18 g","fiber":"0 g","sugar":"11 g","energy":"46 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"11 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-lewis-hamilton.jpg'
  ),
  (
    'monster-energy-loco-mango',
    'Monster Energy Loco Mango',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    false,
    'Monster Mango Loco kombinerer tropiske frugter og mango, tilsat koffein, taurin og B-vitaminer for en sød og frugtagtig smag med ekstra energi.',
    'Kulsyreholdigt vand, frugtsaft fra koncentrat (9%) ( mango, guava,hvid drue,æble,ananas, appelsin, abrikos, fersken, passionsfrugt, citron), saccharose, glucosesirup, syre (citronsyre, æblesyre), taurin (0,4%), aromaer, surhedsregulerende midler (kaliumcitrater, natriumcitrater), panax ginseng rodekstrakt, (0,08%), konserveringsmidler (kaliumsorbat, natriumbenzoat), koffein (0,03%), farve (carotener), sødestof (sucralose), vitaminer (niacin (b3), riboflavin (b2), b6, b12), stabilisatorer (xanthangummi, natriumalginat, arabisk gummi), salt, inositol (0,002%), frugt- og grøntsagskoncentrater (drue, gulerod og sød kartoffel).',
    '{"per100ml":{"fat":"0 g","salt":"0.20 g","fiber":"0 g","sugar":"11 g","energy":"47 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"11 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-loco-mango.jpg'
  ),
  (
    'monster-energy-monarch',
    'Monster Energy Monarch',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    true,
    'Monster Monarch indeholder en blanding af tropiske frugter, koffein, taurin og B-vitaminer, som giver en sød, frugtagtig smag og hurtig energi.',
    'Kulsyreholdigt vand, sukrose, citronsaft fra koncentreret citronsaft (2%), glukosesirup, syrer (citronsyre, æblesyre), taurin (0,4%), aromaer, surhedsregulerende midler (natriumcitrat, kaliumcitrat), koffein (0,03%), konserveringsmiddel (kaliumsorbat), vitaminer (niacin (B3), B6, riboflavin (B2), B12), l-karnitin l-tartrat (0,004%), sødemiddel (sukralose), inositol.',
    '{"per100ml":{"fat":"0 g","salt":"0.2 g","fiber":"0 g","sugar":"0 g","energy":"3 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"0.9 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-monarch.jpg'
  ),
  (
    'monster-energy-nitro',
    'Monster Energy Nitro',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    false,
    'Monster Nitro 500ml er en energidrik forstærket med nitrogenoxid for en ekstra hurtig energiudladning. Ideel for dig, der søger en kraftig energiboost.',
    'Kulsyreholdigt vand, saccharose, glucosesirup, aromaer, syre (citronsyre), taurin (0,4%), surhedsregulerende middel (natriumcitrater), panax ginseng rodekstrakt (0,08%), skumdannende middel (dinitrogenoxid), maltodextrin, konserveringsmidler (kaliumsorbat, natriumbenzoat), koffein (0,03%), vitaminer (niacin (B3), riboflavin (B2), B6, B12), sødestof (sucralose), inositol (0,002%), farve (E133).',
    '{"per100ml":{"fat":"0 g","salt":"0.18 g","fiber":"0 g","sugar":"11 g","energy":"46 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"11 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-nitro.jpg'
  ),
  (
    'monster-energy-pipeline-punch',
    'Monster Energy Pipeline Punch',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    false,
    'Monster Energy Pipeline Punch 500ml kombinerer tropiske frugter som passionsfrugt, appelsin og guava for en unik og forfriskende smag.',
    'Kulsyreholdigt vand, frugtsaft fra koncentrat (16,2%) (æble, appelsin, guava, ananas, passionsfrugt), saccharose, glucosesirup, taurin (0,4%), syre (citronsyre), aromaer, panax ginseng rodekstrakt (0,08%), surhedsregulerende middel (natriumcitrater), konserveringsmidler (kaliumsorbat, natriumbenzoat), koffein (0,03%), sødestof (sucralose), vitaminer (niacin (B3), riboflavin (B2), B6 B12), vegetabilske olier (kokosnød, rapsfrø), modificeret stivelse, salt, inositol (0,002%) farve (carotener), maltodextrin.',
    '{"per100ml":{"fat":"0 g","salt":"0.20 g","fiber":"0 g","sugar":"11 g","energy":"46 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"11 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-pipeline-punch.jpg'
  ),
  (
    'monster-energy-the-doctor',
    'Monster Energy The Doctor',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    false,
    'Monster Energy The Doctor er en energidrik med en citrusagtig smag, kombineret med den karakteristiske Monster-energi.',
    'Kulsyreholdigt vand, saccharose, frugtsaft fra koncentrat (4%) (appelsin, citron), glucosesirup, citronfrugt, aromaer, taurin (0,4%), surhedsregulerende middel (calciumlaktat, natriumcitrat), syre (citronsyre), panax ginseng rodekstrakt (0,08%), konserveringsmiddel (kaliumsorbat), koffein (0,03%), vitaminer (niacin (B3), riboflavin (B2), B6, B12), sødestof (sucralose), inositol.',
    '{"per100ml":{"fat":"0 g","salt":"0.20 g","fiber":"0 g","sugar":"9.7 g","energy":"40 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"9.7 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-the-doctor.jpg'
  ),
  (
    'monster-energy-ultra-fiesta',
    'Monster Energy Ultra Fiesta',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    true,
    'Monster Ultra Fiesta 500ml er en sukkerfri energidrik med festlig, tropisk smag og masser af energi uden kalorier.',
    'Kulsyreholdigt vand, syre (citronsyre), smagsforstærker (Erythritol), taurin (0,4%), surhedsregulerende middel (natriumcitrater), aromaer, panax ginseng rodekstrakt (0,08%), konserveringsmidler (sorbinsyre, benzoesyre), sødestoffer (sucralose, acesulfam K), koffein (0,03%), farvestoffer (carotener, anthocyaniner), vitaminer (niacin (B3), pantotensyre (B5), B6, B12), inositol.',
    '{"per100ml":{"fat":"0 g","salt":"0.2 g","fiber":"0 g","sugar":"0 g","energy":"3 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"0.9 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-ultra-fiesta.jpg'
  ),
  (
    'monster-energy-ultra-gold',
    'Monster Energy Ultra Gold',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    true,
    'Monster Ultra Gold 500ml er en sukkerfri variant i Ultra-serien, der giver et kraftigt energiboost uden kalorier.',
    'Kulsyreholdigt vand, smagsforstærker (Erythritol), syre (citronsyre), taurin (0,4%), aromaer,surhedsregulerende middel (natriumcitrater), panax ginseng rodekstrakt (0,08%), konserveringsmidler (kaliumsorbat, natriumbenzoat), koffein (0,03%) sødestoffer (sucralose, acesulfam K),, farve (karamel) vitaminer (niacin, pantotensyre, B6, B12), natriumclorid, inositol.',
    '{"per100ml":{"fat":"0 g","salt":"0.2 g","fiber":"0 g","sugar":"0 g","energy":"3 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"0.9 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-ultra-gold.jpg'
  ),
  (
    'monster-energy-ultra-peachy-keen',
    'Monster Energy Ultra Peachy Keen',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    true,
    'Mød Ultra Peachy Keen fra Monster – en forfriskende energidrik med en uimodståelig ferskensmag og masser af energi.',
    'Kuldioxidvand, syre (citronsyre), taurin (0,4%), surhedsregulerende middel (natriumcitrat), maltodextrin, Panax ginseng rotextrakt (0,08%), modificeret stivelse, aromaer, konserveringsmiddel (kaliumsorbat, natriumbensoat), sødestof (sukralose, acesulfam K), koffein (0,03%), vegetabilske olier (kokosnød, rapsfrø), L-carnitin L-tartrat (0,015%), vitaminer (niacin (B3), pantotensyre (B5) B6, B12), natriumchlorid, guaranafrøekstrakt (0,002%), inositol, farvestof (karotener).',
    '{"per100ml":{"fat":"0 g","salt":"0.2 g","fiber":"0 g","sugar":"0 g","energy":"3 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"0.9 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-ultra-peachy-keen.jpg'
  ),
  (
    'monster-energy-ultra-rosa',
    'Monster Energy Ultra Rosa',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    true,
    'Monster Ultra Rosa 500ml er en sukkerfri energidrik, perfekt til at give dig et energiboost uden sukker.',
    'Kulsyreholdigt vand, surhedsregulerende midler (citronsyre, E331), sødestoffer (E968, sucralose, acesulfamkalium), taurin, naturlige smagsstoffer, Panax Ginseng, L-Carnitin, koffein, konserveringsmidler (E200, E210), vitamin B3, vitamin B3. , Inositol, Vitamin B6, Vitamin B12.',
    '{"per100ml":{"fat":"0 g","salt":"0.2 g","fiber":"0 g","sugar":"0 g","energy":"3 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"0.9 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-ultra-rosa.jpg'
  ),
  (
    'monster-energy-ultra-zero',
    'Monster Energy Ultra Zero',
    '0.5 l',
    1083,
    1700,
    24,
    100,
    true,
    'Monster Ultra 500ml er en sukkerfri energidrik med en forfriskende, let smag. Giver en kraftig energiboost uden kalorier.',
    'Kulsyreholdigt vand, syre (citronsyre), taurin (0,4%), surhedsregulerende middel (natriumcitrat), aromaer, panax ginseng rodekstrakt (0,08%), sødestoffer (sucralose, acesulfamkalium), konserveringsmiddel (sorbinsyre, benzoesyre), koffein (0,03%), vitaminer (niacin (B3), pantotensyre (B5), B6, B12), inositol (0,002%).',
    '{"per100ml":{"fat":"0 g","salt":"0.2 g","fiber":"0 g","sugar":"0 g","energy":"3 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"0.9 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-ultra-zero.jpg'
  ),
  -- (
  --   'monster-energy-zero',
  --   'Monster Energy Zero',
  --   '0.5 l',
  --   1000,
  --   1700,
  --   24,
  --   100,
  --   true,
  --   'Få et energiboost uden sukker med Monster Absolutely Zero. Monster''s velkendte energi og smag, i en sukkerfri version til en aktiv livsstil.',
  --   'Kulsyreholdigt vand, syre (citronsyre), smagsforstrærker (erythritol), aromaer, taurin (0,4%), surhedsregulerende middel (natriumcitrater), panax ginseng rodekstrakt (0,08%), konserveringsmidler (sorbinsyre, benzoesyre), sødestoffer (sucralose, acesulfam K), koffein (0,03%), farve (anthocyaniner), vitaminer (niacin, riboflavin, B6, B12), guaranaekstrakt (0,002%), inositol.',
  --   '{"per100ml":{"fat":"0 g","salt":"0.2 g","fiber":"0 g","sugar":"0 g","energy":"3 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"0.9 g"}}'::jsonb,
  --   '/storage/v1/object/public/public-images/drinks/monster-energy-zero.jpg'
  -- ),
  (
    'monster-energy-zero-sugar',
    'Monster Energy Zero Sugar',
    '0.5 l',
    1000,
    1700,
    24,
    100,
    true,
    'Monster Energy Zero Sugar 500ml er den klassiske Monster-smag, men helt uden sukker. Leverer en hurtig energiboost og øget fokus.',
    'Kulsyreholdigt vand, syre (citronsyre), smagsforstrærker (erythritol), aromaer, taurin (0,4%), surhedsregulerende middel (natriumcitrater), panax ginseng rodekstrakt (0,08%), konserveringsmidler (sorbinsyre, benzoesyre), sødestoffer (sucralose, acesulfam K), koffein (0,03%), farve (anthocyaniner), vitaminer (niacin, riboflavin, B6, B12), guaranaekstrakt (0,002%), inositol.',
    '{"per100ml":{"fat":"0 g","salt":"0.2 g","fiber":"0 g","sugar":"0 g","energy":"3 kcal","niacin":"8.5 mg (53% NRV)","protein":"0 g","caffeine":"32 mg","vitaminB6":"0.8 mg (57% NRV)","riboflavin":"0.7 mg (50% NRV)","vitaminB12":"2.5 µg (100% NRV)","saturatedFat":"0 g","carbohydrates":"1 g"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/monster-energy-zero-sugar.jpg'
  ),
  (
    'red-bull-apricot-edition',
    'Red Bull Apricot Edition',
    '0.25 l',
    979,
    1500,
    24,
    100,
    false,
    'Red Bull Abrikos 250ml er en forfriskende energidrik med en unik smag af abrikos. Perfekt til at give ekstra energi.',
    'vand, saccharose, glucose, syre (citronsyre), kulsyre, taurin (0,4%), surhedsregulerende middel (natriumcitrater), koffein (0,03%), vitaminer (niacin, pantothensyre, B6). , B12), aromaer, farvestoffer (anthocyaniner, riboflaviner).',
    '{"per100ml":{"fat":"0 g","salt":"0.1 g","fiber":"0 g","sugar":"11.0 g","energy":"45 kcal","niacin":"8 mg (50% NRV)","protein":"0 g","vitaminB6":"2 mg (143% NRV)","vitaminB12":"2 µg (80% NRV)","saturatedFat":"0 g","carbohydrates":"11.0 g","pantothenicAcid":"2 mg (33% NRV)"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/red-bull-apricot-edition.jpg'
  ),
  (
    'red-bull-blue-edition',
    'Red Bull Blue Edition',
    '0.25 l',
    979,
    1500,
    24,
    100,
    false,
    'Red Bull Blueberry 250ml er en energidrik med en frisk blåbærsmag og den klassiske Red Bull-energi.',
    'vand, saccharose, glukose, syre (citronsyre), kuldioxid, taurin (0,4%) surhedsregulerende middel (natriumcarbonater, magnesiumcarbonat), koffein (0,03%), vitaminer (niacin, panthothensyre, B6, B12), aromaer, farvesr ( anthocyaniner brilliant blue FCF).',
    '{"per100ml":{"fat":"0 g","salt":"0.1 g","fiber":"0 g","sugar":"11.0 g","energy":"46 kcal","niacin":"8 mg (50% NRV)","protein":"0 g","vitaminB6":"2 mg (143% NRV)","vitaminB12":"2 µg (80% NRV)","saturatedFat":"0 g","carbohydrates":"11.0 g","pantothenicAcid":"2 mg (33% NRV)"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/red-bull-blue-edition.jpg'
  ),
  (
    'red-bull-original',
    'Red Bull Original',
    '0.25 l',
    979,
    1500,
    24,
    100,
    false,
    'Red Bull Original 250ml er en klassisk energidrik, kendt for sin evne til at give vinger og øge fokus. Indeholder koffein og taurin.',
    'Vand, saccharose, glukose, syre (citron-syre), kuldioxid, taurin (0,4%), surhedsregulerendemiddel (natriumcarbonater, magnesiumcarbonat), koffein (0,03%), vitaminer (niacin, panthothensyre, B6, B12), aromaer, farvestoffer (karamel, riboflavin).',
    '{"per100ml":{"fat":"0 g","salt":"0.1 g","fiber":"0 g","sugar":"11.0 g","energy":"46 kcal","niacin":"8 mg (50% NRV)","protein":"0 g","vitaminB6":"2 mg (143% NRV)","vitaminB12":"2 µg (80% NRV)","saturatedFat":"0 g","carbohydrates":"11.0 g","pantothenicAcid":"2 mg (33% NRV)"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/red-bull-original.jpg'
  ),
  (
    'red-bull-purple-edition',
    'Red Bull Purple Edition',
    '0.25 l',
    979,
    1500,
    24,
    100,
    false,
    'Red Bull The Purple Edition er en energidrik med smag af granatæble. Kombinerer klassisk Red Bull-energi med en frugtig twist.',
    'Vand, saccharose, glukose, syre (citronsyre), kuldioxid, taurin (0,4%), surhedsregulerende midler (natriumcarbonater, magnesiumcarbonater), koffein (0,03%), vitaminer (niacin, pantothensyre, B6, B12), aromaer, farver (anthocyaniner, riboflavin).',
    '{"per100ml":{"fat":"0 g","salt":"0.1 g","fiber":"0 g","sugar":"10.0 g","energy":"44 kcal","niacin":"8 mg (50% NRV)","protein":"0 g","vitaminB6":"2 mg (143% NRV)","vitaminB12":"2 µg (80% NRV)","saturatedFat":"0 g","carbohydrates":"10.0 g","pantothenicAcid":"2 mg (33% NRV)"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/red-bull-purple-edition.jpg'
  ),
  (
    'red-bull-red-edition-watermelon',
    'Red Bull Red Edition Watermelon',
    '0.25 l',
    979,
    1500,
    24,
    100,
    false,
    'Red Bull The Red Edition Watermelon kombinerer den klassiske Red Bull-energi med en forfriskende vandmelonsmag. Perfekt til et ekstra energiboost.',
    'Vand, saccharose, glukose, syre (citron-syre), kuldioxid, taurin (0,4%), surhedsregulerendemiddel (natriumcitrater) koffein (0,03%), vitaminer (niacin, pantothensyre, B6, B12), aromaer, farver (anthocyaniner, riboflavin).',
    '{"per100ml":{"fat":"0 g","salt":"0.1 g","fiber":"0 g","sugar":"11.0 g","energy":"45 kcal","niacin":"8 mg (50% NRV)","protein":"0 g","vitaminB6":"2 mg (143% NRV)","vitaminB12":"2 µg (80% NRV)","saturatedFat":"0 g","carbohydrates":"11.0 g","pantothenicAcid":"2 mg (33% NRV)"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/red-bull-red-edition-watermelon.jpg'
  ),
  (
    'red-bull-sugarfree',
    'Red Bull Sugarfree',
    '0.25 l',
    979,
    1500,
    24,
    100,
    true,
    'Red Bull Sugarfree er til dig, der gerne vil have en sukkerfri energidrik! Her får du altså vinger uden sukker og stadig det velkendte energiboost.',
    'Vand, syre (citronsyre), kuldioxid, taurin (0,4%), surhedsregulerende midler (natriumcarbonater, magnesiumcarbonater), sødestoffer (sucralose, acesulfamkalium), koffein (0,03%), vitaminer (niacin, pantothensyre, B6, B12), aromaer, fortykningsmiddel (xanthangummi), farver (karamel, riboflavin). Indeholder en phenylalaninkilde.',
    '{"per100ml":{"fat":"0 g","salt":"0.1 g","fiber":"0 g","sugar":"0 g","energy":"3 kcal","niacin":"8 mg (50% NRV)","protein":"0 g","vitaminB6":"2 mg (143% NRV)","vitaminB12":"2 µg (80% NRV)","saturatedFat":"0 g","carbohydrates":"0 g","pantothenicAcid":"2 mg (50% NRV)"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/red-bull-sugarfree.jpg'
  ),
  (
    'red-bull-winter-edition',
    'Red Bull Winter Edition',
    '0.25 l',
    979,
    1500,
    24,
    100,
    false,
    'Når dagene bliver kortere, og luften køligere, er det tid til den nye Red Bull Winter Edition: Iced Vanilla Berry! Perfekt til kolde eventyr.',
    'Vand, saccharose, glucose, syrningsmiddel (citronsyre), kulsyre, taurin (0,4%), surhedsregulerende middel (natriumcitrat), koffein (0,03%), vitaminer (niacin, pantothensyre, B6, B12), smagsstoffer, farvestoffer ( strålende blå FCF).',
    '{"per100ml":{"fat":"0 g","salt":"0.1 g","fiber":"0 g","sugar":"11 g","energy":"46 kcal","niacin":"8 mg (50% NRV)","protein":"0 g","vitaminB6":"2 mg (143% NRV)","vitaminB12":"2 µg (80% NRV)","saturatedFat":"0 g","carbohydrates":"11 g","pantothenicAcid":"2 mg (33% NRV)"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/red-bull-winter-edition.jpg'
  ),
  (
    'red-bull-zero',
    'Red Bull Zero',
    '0.25 l',
    1000,
    1500,
    24,
    100,
    true,
    'Red Bull Zero Calories 250ml er en sukkerfri energidrik, der giver dig den velkendte Red Bull-energi uden kalorier.',
    'vand, syre (citronsyre), kuldioxid, taurin (0,4%), surhedsregulerende midler (natriumcarbonater, magnesiumcarbonater), sødestoffer (acesulfamkalium, sucralose, steviolglycosider fra stevia), koffein (0,03%), vitaminer (niacin, pantothensyre, B6, B12), aromaer, fortykningsmiddel (xanthangummi), smagsforstærker (thaumatin), farver (karamel, riboflavin).',
    '{"per100ml":{"fat":"0 g","salt":"0.02 g","fiber":"0 g","sugar":"0 g","energy":"2 kcal","niacin":"8 mg (50% NRV)","protein":"0 g","vitaminB6":"2 mg (143% NRV)","vitaminB12":"2 µg (80% NRV)","saturatedFat":"0 g","carbohydrates":"0 g","pantothenicAcid":"2 mg (33% NRV)"}}'::jsonb,
    '/storage/v1/object/public/public-images/drinks/red-bull-zero.jpg'
  );




--------------------------------------------------------------------------------
-- PACKAGES
--------------------------------------------------------------------------------
INSERT INTO packages (slug, title, description, image, category)
VALUES
('mixed-booster-mix','Dit Booster Mix','Oplev den ultimative energioplevelse med vores nøje sammensatte pakke af energidrikke! Hos Mixed Energy sørger vi for, at du altid er klar til at præstere, uanset om det er på arbejdet, i træningscenteret eller under en lang køretur. 🏋️‍♂️🚗⚡','/storage/v1/object/public/public-images/packages/mixed-boosters.jpg','bland-selv-mix'),
('mixed-boosters','Booster Mix','Forestil dig en kasse fyldt med ren energi – skræddersyet præcis til dig. 8, 12 eller 18 nøje udvalgte energidrikke, der passer til din smag, dit humør og dine behov. Hvad venter du på? Sammensæt din ultimative energiboks nu – det er som at give dig selv en gave, der aldrig svigter! 🚀','/storage/v1/object/public/public-images/packages/mixed-boosters.jpg','vi-blander-for-dig'),
('mixed-monster-mix','Dit Monster Mix','Oplev den ultimative energioplevelse med vores nøje sammensatte pakke af energidrikke! Hos Mixed Energy sørger vi for, at du altid er klar til at præstere, uanset om det er på arbejdet, i træningscenteret eller under en lang køretur. 🏋️‍♂️🚗⚡','/storage/v1/object/public/public-images/packages/mixed-monsters.jpg','bland-selv-mix'),
('mixed-monsters','Monster Mix','Forestil dig en kasse fyldt med ren energi – skræddersyet præcis til dig. 8, 12 eller 18 nøje udvalgte energidrikke, der passer til din smag, dit humør og dine behov. Hvad venter du på? Sammensæt din ultimative energiboks nu – det er som at give dig selv en gave, der aldrig svigter! 🚀','/storage/v1/object/public/public-images/packages/mixed-monsters.jpg','vi-blander-for-dig'),
('mixed-red-bull-mix','Dit Red Bull Mix','Oplev den ultimative energioplevelse med vores nøje sammensatte pakke af energidrikke! Hos Mixed Energy sørger vi for, at du altid er klar til at præstere, uanset om det er på arbejdet, i træningscenteret eller under en lang køretur. 🏋️‍♂️🚗⚡','/storage/v1/object/public/public-images/packages/mixed-red-bulls.jpg','bland-selv-mix'),
('mixed-red-bulls','Red Bull Mix','Forestil dig en kasse fyldt med ren energi – skræddersyet præcis til dig. 8, 12 eller 18 nøje udvalgte energidrikke, der passer til din smag, dit humør og dine behov. Hvad venter du på? Sammensæt din ultimative energiboks nu – det er som at give dig selv en gave, der aldrig svigter! 🚀','/storage/v1/object/public/public-images/packages/mixed-red-bulls.jpg','vi-blander-for-dig')
;

--------------------------------------------------------------------------------
-- PACKAGE_SIZES
--------------------------------------------------------------------------------


--------------------------------------------------------------------------------
-- PACKAGE_SIZES (Corrected)
--------------------------------------------------------------------------------

-- mixed-booster-mix
INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 8, 1, 5
FROM packages p
WHERE p.slug = 'mixed-booster-mix';

INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 12, 0.95, 5
FROM packages p
WHERE p.slug = 'mixed-booster-mix';

INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 18, 0.90, 5
FROM packages p
WHERE p.slug = 'mixed-booster-mix';

-- mixed-boosters
INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 8, 1, 5
FROM packages p
WHERE p.slug = 'mixed-boosters';

INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 12, 0.95, 5
FROM packages p
WHERE p.slug = 'mixed-boosters';

INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 18, 0.90, 5
FROM packages p
WHERE p.slug = 'mixed-boosters';

-- mixed-red-bulls
INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 8, 1, 5
FROM packages p
WHERE p.slug = 'mixed-red-bulls';

INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 12, 0.95, 5
FROM packages p
WHERE p.slug = 'mixed-red-bulls';

INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 18, 0.90, 5
FROM packages p
WHERE p.slug = 'mixed-red-bulls';

-- mixed-red-bull-mix
INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 8, 1, 5
FROM packages p
WHERE p.slug = 'mixed-red-bull-mix';

INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 12, 0.95, 5
FROM packages p
WHERE p.slug = 'mixed-red-bull-mix';

INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 18, 0.90, 5
FROM packages p
WHERE p.slug = 'mixed-red-bull-mix';

-- mixed-monsters
INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 8, 1, 5
FROM packages p
WHERE p.slug = 'mixed-monsters';

INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 12, 0.95, 5
FROM packages p
WHERE p.slug = 'mixed-monsters';

INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 18, 0.90, 5
FROM packages p
WHERE p.slug = 'mixed-monsters';

-- mixed-monster-mix
INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 8, 1, 5
FROM packages p
WHERE p.slug = 'mixed-monster-mix';

INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 12, 0.95, 5
FROM packages p
WHERE p.slug = 'mixed-monster-mix';

INSERT INTO package_sizes (package_id, size, discount, round_up_or_down)
SELECT p.id, 18, 0.90, 5
FROM packages p
WHERE p.slug = 'mixed-monster-mix';






--------------------------------------------------------------------------------
-- PACKAGE_DRINKS
-- Link each package to the relevant drinks
--------------------------------------------------------------------------------

--
-- 1) BOOSTERS: 9 booster drinks (IDs 1..9)
--    slugs = 'faxe-kondi-booster-*'
--    Link them to 'mixed-booster-mix' (bland-selv-mix) AND 'mixed-boosters' (vi-blander-for-dig)
--
INSERT INTO package_drinks (package_id, drink_id)
SELECT p.id, d.id
FROM packages p
JOIN drinks d 
  ON d.slug IN (
    'faxe-kondi-booster-black-edition',
    'faxe-kondi-booster-energy',
    'faxe-kondi-booster-free',
    'faxe-kondi-booster-frosty-blue',
    'faxe-kondi-booster-original',
    'faxe-kondi-booster-pink-dragon',
    -- 'faxe-kondi-booster-sort-passion',
    'faxe-kondi-booster-sort-zero',
    'faxe-kondi-booster-twisted-ice-zero'
  )
WHERE p.slug IN ('mixed-booster-mix','mixed-boosters');

--
-- 2) MONSTERS: 15 monster drinks (IDs 10..24)
--    slugs = 'monster-energy*'
--    Link them to 'mixed-monster-mix' (bland-selv-mix) AND 'mixed-monsters' (vi-blander-for-dig)
--
INSERT INTO package_drinks (package_id, drink_id)
SELECT p.id, d.id
FROM packages p
JOIN drinks d 
  ON d.slug IN (
    'monster-energy',
    'monster-energy-khaotic',
    'monster-energy-lewis-hamilton',
    'monster-energy-loco-mango',
    'monster-energy-monarch',
    'monster-energy-nitro',
    'monster-energy-pipeline-punch',
    'monster-energy-the-doctor',
    'monster-energy-ultra-fiesta',
    'monster-energy-ultra-gold',
    'monster-energy-ultra-peachy-keen',
    'monster-energy-ultra-rosa',
    'monster-energy-ultra-zero',
    -- 'monster-energy-zero',
    'monster-energy-zero-sugar'
  )
WHERE p.slug IN ('mixed-monster-mix','mixed-monsters');

--
-- 3) RED BULLS: 8 red bull drinks (IDs 25..32)
--    slugs = 'red-bull-*'
--    Link them to 'mixed-red-bull-mix' (bland-selv-mix) AND 'mixed-red-bulls' (vi-blander-for-dig)
--
INSERT INTO package_drinks (package_id, drink_id)
SELECT p.id, d.id
FROM packages p
JOIN drinks d
  ON d.slug IN (
    'red-bull-apricot-edition',
    'red-bull-blue-edition',
    'red-bull-original',
    'red-bull-purple-edition',
    'red-bull-red-edition-watermelon',
    'red-bull-sugarfree',
    'red-bull-winter-edition',
    'red-bull-zero'
  )
WHERE p.slug IN ('mixed-red-bull-mix','mixed-red-bulls');

--------------------------------------------------------------------------------
-- Done linking packages to drinks
--------------------------------------------------------------------------------



























--------------------------------------------------------------------------------
-- PACKAGE_DRINKS
--------------------------------------------------------------------------------

-- For “mixed-booster-mix”, link it with 9 booster drinks:
INSERT INTO package_drinks (package_id, drink_id)
SELECT p.id, d.id
FROM packages p
JOIN drinks d ON d.slug = 'faxe-kondi-booster-original'
WHERE p.slug = 'mixed-booster-mix';

-- Repeat for all booster slugs you want included
INSERT INTO package_drinks (package_id, drink_id)
SELECT p.id, d.id
FROM packages p
JOIN drinks d ON d.slug = 'faxe-kondi-booster-free'
WHERE p.slug = 'mixed-booster-mix';

-- etc. for “mixed-boosters”, “mixed-monster-mix”, etc.

--------------------------------------------------------------------------------
-- ORDERS (optional)
--------------------------------------------------------------------------------
-- INSERT INTO orders
--   (
--     order_key,
--     session_id,
--     order_id,
--     basket_details,
--     quickpay_details,
--     status,
--     order_confirmation_send,
--     order_invoice_send,
--     shipmondo_shipment_id,
--     tracking_number,
--     tracking_url,
--     carrier,
--     shipping_label_url,
--     shipping_cost,
--     shipping_method,
--     shipping_address,
--     tracking_status
--   )
-- VALUES
-- (
--   'order-example',
--   'session-example',
--   NULL,
--   '{
--     "basketItems": [
--       {
--         "packageSlug": "mixed-monsters",
--         "quantity": 2,
--         "packagesSize": 8,
--         "selectedDrinks": {
--           "monster-energy": 3,
--           "monster-energy-zero": 1
--         },
--         "recyclingFee": 1400,
--         "price": 31700
--       }
--     ],
--     "customerDetails": {
--       "fullName": "Victor Reipur",
--       "mobileNumber": "26129604",
--       "email": "victor.reipur@gmail.com",
--       "address": "Vinkelvej 12D, 3tv",
--       "postalCode": "2800",
--       "city": "Kongens Lyngby"
--     },
--     "deliveryDetails": {
--       "provider": "postnord",
--       "trackingNumber": "123456789",
--       "estimatedDeliveryDate": "2023-10-25T10:00:00Z",
--       "deliveryFee": 8300,
--       "currency": "DKK",
--       "deliveryAddress": {
--         "name": "Victor Reipur",
--         "streetName": "Vinkelvej 12D, 3tv",
--         "postalCode": "2800",
--         "city": "Kongens Lyngby",
--         "country": "Danmark"
--       },
--       "providerDetails": {
--         "postnord": {
--           "servicePointId": "12345",
--           "deliveryMethod": "homeDelivery"
--         }
--       },
--       "createdAt": "2023-10-21T12:34:56Z"
--     }
--   }'::jsonb,
--   '{}'::jsonb,
--   'pending',
--   TRUE,
--   FALSE,
--   'SH12345ABC',                                       -- shipmondo_shipment_id
--   '123456789',                                        -- tracking_number
--   'https://shipmondo.com/track/123456789',            -- tracking_url
--   'postnord',                                         -- carrier
--   'https://shipmondo.com/label/SH12345ABC',           -- shipping_label_url
--   8300,                                               -- shipping_cost in øre => 83.00 DKK
--   'homeDelivery',                                     -- shipping_method
--   '{
--     "name": "Victor Reipur",
--     "streetName": "Vinkelvej 12D, 3tv",
--     "postalCode": "2800",
--     "city": "Kongens Lyngby",
--     "country": "Danmark"
--   }'::jsonb,                                          -- shipping_address (JSONB)
--   'Awaiting pick-up'                                  -- tracking_status
-- );



--------------------------------------------------------------------------------
-- SESSIONS (optional)
--------------------------------------------------------------------------------
-- If you like, insert an example session row...
-- INSERT INTO sessions
--   (session_id, allow_cookies, basket_details, temporary_selections)
-- VALUES
-- (
--   'example-session-id',
--   false,
--   '{"items":[],"customerDetails":{},"deliveryDetails":{}}'::jsonb,
--   NULL
-- );

--------------------------------------------------------------------------------
-- POSTAL_SERVICE (NEW)
-- Store shipping fees for postnord + gls, with different max_weight brackets.
--------------------------------------------------------------------------------

-- PostNord => homeDelivery
INSERT INTO postal_service (provider, delivery_type, max_weight, fee)
VALUES
('postnord','homeDelivery',1,7500),
('postnord','homeDelivery',2,7500),
('postnord','homeDelivery',5,7500),
('postnord','homeDelivery',10,7500),
('postnord','homeDelivery',15,7500),
('postnord','homeDelivery',20,7500),
('postnord','homeDelivery',25,7500),
('postnord','homeDelivery',30,7500),
('postnord','homeDelivery',35,7500);

-- PostNord => pickupPoint
INSERT INTO postal_service (provider, delivery_type, max_weight, fee)
VALUES
('postnord','pickupPoint',1,5500),
('postnord','pickupPoint',2,5500),
('postnord','pickupPoint',5,5500),
('postnord','pickupPoint',10,5500),
('postnord','pickupPoint',15,5500),
('postnord','pickupPoint',20,5500),
('postnord','pickupPoint',25,5500),
('postnord','pickupPoint',30,5500),
('postnord','pickupPoint',35,5500);

-- GLS => homeDelivery (example, adjust as you wish)
INSERT INTO postal_service (provider, delivery_type, max_weight, fee)
VALUES
('gls','homeDelivery',1,4400),
('gls','homeDelivery',2,5100),
('gls','homeDelivery',5,6600),
('gls','homeDelivery',10,8400),
('gls','homeDelivery',15,10100),
('gls','homeDelivery',20,11100),
('gls','homeDelivery',25,11700),
('gls','homeDelivery',30,12600),
('gls','homeDelivery',35,13600);

-- GLS => pickupPoint
INSERT INTO postal_service (provider, delivery_type, max_weight, fee)
VALUES
('gls','pickupPoint',1,3300),
('gls','pickupPoint',2,4000),
('gls','pickupPoint',5,5600),
('gls','pickupPoint',10,7600),
('gls','pickupPoint',15,8600),
('gls','pickupPoint',20,8950),
('gls','pickupPoint',25,11100),
('gls','pickupPoint',30,12600),
('gls','pickupPoint',35,13600);

COMMIT;