/*
  # Add Investment Descriptions And Holding Days

  This migration:
  - adds a description field to investment assets
  - creates a query function for investment summaries, including holding days
*/

ALTER TABLE investment_assets
ADD COLUMN IF NOT EXISTS description text;

DROP FUNCTION IF EXISTS get_investment_asset_summaries();

CREATE OR REPLACE FUNCTION get_investment_asset_summaries()
RETURNS TABLE (
  asset_id uuid,
  name text,
  symbol text,
  asset_type text,
  description text,
  created_at timestamptz,
  first_investment_date timestamptz,
  holding_days integer,
  units_held numeric,
  total_fees numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    investment_assets.id AS asset_id,
    investment_assets.name,
    investment_assets.symbol,
    investment_assets.type AS asset_type,
    investment_assets.description,
    investment_assets.created_at,
    COALESCE(
      MIN(transactions.date) FILTER (
        WHERE transactions.type IN ('investment_buy', 'investment_sell')
      ),
      investment_assets.created_at
    ) AS first_investment_date,
    GREATEST(
      0,
      (
        CURRENT_DATE
        - COALESCE(
            MIN(transactions.date) FILTER (
              WHERE transactions.type IN ('investment_buy', 'investment_sell')
            )::date,
            investment_assets.created_at::date
          )
      )::integer    
    ) AS holding_days,
    COALESCE(
      SUM(investment_entries.quantity) FILTER (
        WHERE transactions.type = 'investment_buy'
      ),
      0
    ) - COALESCE(
      SUM(investment_entries.quantity) FILTER (
        WHERE transactions.type = 'investment_sell'
      ),
      0
    ) AS units_held,
    COALESCE(SUM(investment_entries.fees), 0) AS total_fees
  FROM investment_assets
  LEFT JOIN investment_entries
    ON investment_entries.asset_id = investment_assets.id
  LEFT JOIN transactions
    ON transactions.id = investment_entries.transaction_id
   AND transactions.user_id = auth.uid()
  WHERE investment_assets.user_id = auth.uid()
  GROUP BY
    investment_assets.id,
    investment_assets.name,
    investment_assets.symbol,
    investment_assets.type,
    investment_assets.description,
    investment_assets.created_at
  ORDER BY investment_assets.created_at DESC;
$$;
