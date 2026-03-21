/*
  # Fix Investment Profit And Loss Calculation

  The previous summary function reduced `total_invested` by sale proceeds, which
  caused remaining cost basis, average price, current value, and profit/loss to
  become incorrect after any sell transaction.

  This version uses an average-cost basis and calculates realized profit/loss:
  - buy cost = sum of buy quantity * price + fees
  - average buy price = buy cost / total bought units
  - total invested = total historical buy cost
  - remaining cost basis = average buy price * units currently held
  - sell proceeds = sum of sell quantity * price - fees
  - realized profit/loss = sell proceeds - (average buy price * units sold)

  Note:
  - without a live/current market price column, unrealized profit on unsold holdings
    cannot be calculated accurately
  - `current_value` therefore falls back to remaining cost basis
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
  WITH asset_activity AS (
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
      ) AS total_buy_units,
      COALESCE(
        SUM(investment_entries.quantity) FILTER (
          WHERE transactions.type = 'investment_sell'
        ),
        0
      ) AS total_sell_units,
      COALESCE(
        SUM(
          (investment_entries.quantity * investment_entries.price_per_unit) + investment_entries.fees
        ) FILTER (
          WHERE transactions.type = 'investment_buy'
        ),
        0
      ) AS total_buy_cost,
      COALESCE(
        SUM(
          GREATEST(
            (investment_entries.quantity * investment_entries.price_per_unit) - investment_entries.fees,
            0
          )
        ) FILTER (
          WHERE transactions.type = 'investment_sell'
        ),
        0
      ) AS total_sell_proceeds,
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
  ),
  asset_totals AS (
    SELECT
      asset_activity.asset_id,
      asset_activity.name,
      asset_activity.symbol,
      asset_activity.asset_type,
      asset_activity.description,
      asset_activity.created_at,
      asset_activity.first_investment_date,
      asset_activity.holding_days,
      asset_activity.total_buy_units - asset_activity.total_sell_units AS units_held,
      asset_activity.total_buy_cost,
      asset_activity.total_sell_units,
      asset_activity.total_sell_proceeds,
      asset_activity.total_fees,
      CASE
        WHEN asset_activity.total_buy_units > 0
          THEN asset_activity.total_buy_cost / asset_activity.total_buy_units
        ELSE 0
      END AS average_buy_price
    FROM asset_activity
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
    asset_totals.total_buy_cost AS total_invested,
    asset_totals.average_buy_price,
    asset_totals.average_buy_price AS placeholder_price,
    CASE
      WHEN asset_totals.units_held > 0
        THEN asset_totals.units_held * asset_totals.average_buy_price
      ELSE 0
    END AS current_value,
    CASE
      WHEN asset_totals.total_sell_units > 0
        THEN asset_totals.total_sell_proceeds
             - (asset_totals.total_sell_units * asset_totals.average_buy_price)
      ELSE 0
    END AS profit_loss
  FROM asset_totals
  ORDER BY asset_totals.created_at DESC;
$$;
