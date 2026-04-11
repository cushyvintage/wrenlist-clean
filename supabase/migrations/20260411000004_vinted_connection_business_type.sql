-- Track whether a connected Vinted account is a Pro/business seller.
-- Source: Vinted public user API exposes a `business` boolean and (when true)
-- nested `business_account` details. We store a minimal flag + type label so
-- the UI can surface "Pro" vs "Personal" on the platform-connect and import
-- pages. Pro sellers are required to issue invoices which affects how sales
-- imports are treated.
ALTER TABLE public.vinted_connections
  ADD COLUMN IF NOT EXISTS is_business boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS business_account_type text;

COMMENT ON COLUMN public.vinted_connections.is_business IS 'True if the connected Vinted account is a Pro/business seller (from Vinted public user API business flag).';
COMMENT ON COLUMN public.vinted_connections.business_account_type IS 'Vinted business account tier/type when known (e.g. pro). Null for personal accounts.';
