/*
  # Recreate Core Finance Schema

  This migration is written so you can rebuild the app schema cleanly.
  It drops the app-owned tables and function first, then recreates:
  - users
  - accounts
  - investment_assets
  - transactions
  - investment_entries
  - get_account_balances()
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP FUNCTION IF EXISTS get_account_balances();

DROP TABLE IF EXISTS investment_entries CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS investment_assets CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('cash', 'bank', 'savings', 'investment')),
  currency text NOT NULL DEFAULT 'NGN',
  initial_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX accounts_user_id_idx ON accounts(user_id);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own accounts"
  ON accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE investment_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  symbol text NOT NULL,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT investment_assets_symbol_unique_per_user UNIQUE (user_id, symbol)
);

CREATE INDEX investment_assets_user_id_idx ON investment_assets(user_id);

ALTER TABLE investment_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own investment assets"
  ON investment_assets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investment assets"
  ON investment_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (
    type IN (
      'income',
      'expense',
      'transfer_in',
      'transfer_out',
      'investment_buy',
      'investment_sell'
    )
  ),
  amount numeric NOT NULL CHECK (amount >= 0),
  date timestamptz NOT NULL,
  category text,
  source text,
  description text,
  asset_id uuid REFERENCES investment_assets(id) ON DELETE SET NULL,
  reference_id uuid,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_income_source_check CHECK (
    (type = 'income' AND source IS NOT NULL AND btrim(source) <> '')
    OR type IN ('expense', 'transfer_in', 'transfer_out', 'investment_buy', 'investment_sell')
  ),
  CONSTRAINT transactions_expense_description_check CHECK (
    (type = 'expense' AND description IS NOT NULL AND btrim(description) <> '')
    OR type IN ('income', 'transfer_in', 'transfer_out', 'investment_buy', 'investment_sell')
  ),
  CONSTRAINT transactions_transfer_reference_check CHECK (
    (type IN ('transfer_in', 'transfer_out') AND reference_id IS NOT NULL)
    OR type IN ('income', 'expense', 'investment_buy', 'investment_sell')
  ),
  CONSTRAINT transactions_investment_asset_check CHECK (
    (type IN ('investment_buy', 'investment_sell') AND asset_id IS NOT NULL)
    OR type IN ('income', 'expense', 'transfer_in', 'transfer_out')
  )
);

CREATE INDEX transactions_user_id_idx ON transactions(user_id);
CREATE INDEX transactions_account_id_idx ON transactions(account_id);
CREATE INDEX transactions_date_idx ON transactions(date DESC);
CREATE INDEX transactions_reference_id_idx ON transactions(reference_id);
CREATE INDEX transactions_asset_id_idx ON transactions(asset_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
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

CREATE TABLE investment_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  quantity numeric NOT NULL CHECK (quantity > 0),
  price_per_unit numeric NOT NULL CHECK (price_per_unit >= 0),
  fees numeric NOT NULL DEFAULT 0 CHECK (fees >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX investment_entries_transaction_id_idx ON investment_entries(transaction_id);

ALTER TABLE investment_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own investment entries"
  ON investment_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM transactions
      WHERE transactions.id = investment_entries.transaction_id
        AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own investment entries"
  ON investment_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM transactions
      WHERE transactions.id = investment_entries.transaction_id
        AND transactions.user_id = auth.uid()
        AND transactions.type IN ('investment_buy', 'investment_sell')
    )
  );

CREATE OR REPLACE FUNCTION get_account_balances()
RETURNS TABLE (
  account_id uuid,
  account_name text,
  account_type text,
  currency text,
  initial_balance numeric,
  income_total numeric,
  expense_total numeric,
  balance numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    accounts.id AS account_id,
    accounts.name AS account_name,
    accounts.type AS account_type,
    accounts.currency,
    accounts.initial_balance,
    COALESCE(
      SUM(transactions.amount) FILTER (WHERE transactions.type = 'income'),
      0
    ) AS income_total,
    COALESCE(
      SUM(transactions.amount) FILTER (WHERE transactions.type = 'expense'),
      0
    ) AS expense_total,
    accounts.initial_balance
      + COALESCE(
          SUM(transactions.amount) FILTER (
            WHERE transactions.type IN ('income', 'transfer_in', 'investment_sell')
          ),
          0
        )
      - COALESCE(
          SUM(transactions.amount) FILTER (
            WHERE transactions.type IN ('expense', 'transfer_out', 'investment_buy')
          ),
          0
        ) AS balance
  FROM accounts
  LEFT JOIN transactions
    ON transactions.account_id = accounts.id
   AND transactions.user_id = auth.uid()
  WHERE accounts.user_id = auth.uid()
  GROUP BY
    accounts.id,
    accounts.name,
    accounts.type,
    accounts.currency,
    accounts.initial_balance,
    accounts.created_at
  ORDER BY accounts.created_at DESC;
$$;
