-- Add supplier_id FK to sourcing_trips for linking trips to suppliers
ALTER TABLE sourcing_trips ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- Index for filtering trips by supplier
CREATE INDEX IF NOT EXISTS idx_sourcing_trips_supplier_id ON sourcing_trips(supplier_id);
