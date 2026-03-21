/*
  # Add Dynamic Investment Calculations

  Extends the investment summary function to return:
  - total units
  - total invested
  - average buy price
  - placeholder current price
  - current value
  - profit/loss
*/

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
  total_fees numeric,
  total_invested numeric,
  average_buy_price numeric,
  placeholder_price numeric,
  current_value numeric,
  profit_loss numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH asset_totals AS (
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
      COALESCE(SUM(investment_entries.fees), 0) AS total_fees,
      COALESCE(
        SUM(
          (investment_entries.quantity * investment_entries.price_per_unit) + investment_entries.fees
        ) FILTER (
          WHERE transactions.type = 'investment_buy'
        ),
        0
      ) - COALESCE(
        SUM(
          GREATEST(
            (investment_entries.quantity * investment_entries.price_per_unit) - investment_entries.fees,
            0
          )
        ) FILTER (
          WHERE transactions.type = 'investment_sell'
        ),
        0
      ) AS total_invested
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
  )
  SELECT
    asset_totals.asset_id,
    asset_totals.name,
    asset_totals.symbol,
    asset_totals.asset_type,
    asset_totals.description,
    asset_totals.created_at,
    asset_totals.first_investment_date,
    asset_totals.holding_days,
    asset_totals.units_held,
    asset_totals.total_fees,
    asset_totals.total_invested,
    CASE
      WHEN asset_totals.units_held > 0
        THEN asset_totals.total_invested / asset_totals.units_held
      ELSE 0
    END AS average_buy_price,
    CASE
      WHEN asset_totals.units_held > 0
        THEN (asset_totals.total_invested / asset_totals.units_held) * 1.05
      ELSE 0
    END AS placeholder_price,
    CASE
      WHEN asset_totals.units_held > 0
        THEN asset_totals.units_held * ((asset_totals.total_invested / asset_totals.units_held) * 1.05)
      ELSE 0
    END AS current_value,
    CASE
      WHEN asset_totals.units_held > 0
        THEN (asset_totals.units_held * ((asset_totals.total_invested / asset_totals.units_held) * 1.05))
             - asset_totals.total_invested
      ELSE 0 - asset_totals.total_invested
    END AS profit_loss
  FROM asset_totals
  ORDER BY asset_totals.created_at DESC;
$$;
