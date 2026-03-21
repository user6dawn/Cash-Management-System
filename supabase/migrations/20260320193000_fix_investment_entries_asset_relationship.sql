/*
  # Fix Investment Asset To Entry Relationship

  Supabase nested selects between `investment_assets` and `investment_entries`
  require a direct foreign key relationship in the schema cache.
  This migration adds `investment_entries.asset_id`, backfills it from the
  linked transaction record, and enforces the relationship going forward.
*/

ALTER TABLE investment_entries
ADD COLUMN IF NOT EXISTS asset_id uuid;

UPDATE investment_entries
SET asset_id = transactions.asset_id
FROM transactions
WHERE transactions.id = investment_entries.transaction_id
  AND investment_entries.asset_id IS NULL;

ALTER TABLE investment_entries
ALTER COLUMN asset_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'investment_entries_asset_id_fkey'
  ) THEN
    ALTER TABLE investment_entries
    ADD CONSTRAINT investment_entries_asset_id_fkey
    FOREIGN KEY (asset_id) REFERENCES investment_assets(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS investment_entries_asset_id_idx
  ON investment_entries(asset_id);
