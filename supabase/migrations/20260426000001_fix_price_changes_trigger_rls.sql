-- Fix: log_find_price_change trigger fails when authenticated users update
-- finds.asking_price_gbp because price_changes has RLS but no INSERT policy.
-- Adding SECURITY DEFINER lets the trigger run as the function owner and
-- bypass RLS — the trigger itself already constrains the insert to NEW.user_id
-- so cross-user writes aren't possible.
--
-- Symptom: PUT /api/finds/[id] returns 500 with
-- "new row violates row-level security policy for table 'price_changes'".

CREATE OR REPLACE FUNCTION log_find_price_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.asking_price_gbp IS DISTINCT FROM NEW.asking_price_gbp THEN
    INSERT INTO price_changes (find_id, user_id, old_price, new_price)
    VALUES (NEW.id, NEW.user_id, OLD.asking_price_gbp, NEW.asking_price_gbp);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
