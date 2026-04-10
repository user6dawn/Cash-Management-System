/*
  # Add RLS Policies For Edit/Delete Operations

  This migration enables authenticated users to UPDATE and DELETE only their own:
  - accounts
  - transactions
  - investment_assets
  - investment_entries
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'accounts'
      AND policyname = 'Users can update own accounts'
  ) THEN
    CREATE POLICY "Users can update own accounts"
      ON accounts
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'accounts'
      AND policyname = 'Users can delete own accounts'
  ) THEN
    CREATE POLICY "Users can delete own accounts"
      ON accounts
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transactions'
      AND policyname = 'Users can update own transactions'
  ) THEN
    CREATE POLICY "Users can update own transactions"
      ON transactions
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1
          FROM accounts
          WHERE accounts.id = account_id
            AND accounts.user_id = auth.uid()
        )
        AND (
          asset_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM investment_assets
            WHERE investment_assets.id = asset_id
              AND investment_assets.user_id = auth.uid()
          )
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transactions'
      AND policyname = 'Users can delete own transactions'
  ) THEN
    CREATE POLICY "Users can delete own transactions"
      ON transactions
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'investment_assets'
      AND policyname = 'Users can update own investment assets'
  ) THEN
    CREATE POLICY "Users can update own investment assets"
      ON investment_assets
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'investment_assets'
      AND policyname = 'Users can delete own investment assets'
  ) THEN
    CREATE POLICY "Users can delete own investment assets"
      ON investment_assets
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'investment_entries'
      AND policyname = 'Users can update own investment entries'
  ) THEN
    CREATE POLICY "Users can update own investment entries"
      ON investment_entries
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM transactions
          WHERE transactions.id = investment_entries.transaction_id
            AND transactions.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM transactions
          WHERE transactions.id = investment_entries.transaction_id
            AND transactions.user_id = auth.uid()
            AND transactions.type IN ('investment_buy', 'investment_sell')
        )
        AND EXISTS (
          SELECT 1
          FROM investment_assets
          WHERE investment_assets.id = investment_entries.asset_id
            AND investment_assets.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'investment_entries'
      AND policyname = 'Users can delete own investment entries'
  ) THEN
    CREATE POLICY "Users can delete own investment entries"
      ON investment_entries
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM transactions
          WHERE transactions.id = investment_entries.transaction_id
            AND transactions.user_id = auth.uid()
        )
      );
  END IF;
END $$;
