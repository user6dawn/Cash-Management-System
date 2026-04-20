/*
  # Cascade transaction deletes when removing an investment asset

  Investment transactions require `asset_id` to stay populated, so the original
  `ON DELETE SET NULL` foreign key on `transactions.asset_id` causes asset
  deletion to fail. Switching to `ON DELETE CASCADE` keeps the schema aligned
  with the investment transaction check constraint.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_asset_id_fkey'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      DROP CONSTRAINT transactions_asset_id_fkey;
  END IF;

  ALTER TABLE transactions
    ADD CONSTRAINT transactions_asset_id_fkey
    FOREIGN KEY (asset_id) REFERENCES investment_assets(id) ON DELETE CASCADE;
END $$;
