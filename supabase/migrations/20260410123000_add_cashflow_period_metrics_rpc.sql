/*
  # Add Cashflow Period Metrics RPC

  Returns pre-aggregated income/expense metrics grouped by week or month
  for the authenticated user within a bounded month window.
*/

DROP FUNCTION IF EXISTS get_cashflow_period_metrics(text, integer);

CREATE OR REPLACE FUNCTION get_cashflow_period_metrics(
  p_grouping text DEFAULT 'monthly',
  p_months integer DEFAULT 12
)
RETURNS TABLE (
  period_start timestamptz,
  period_end timestamptz,
  income numeric,
  expense numeric,
  net numeric,
  transaction_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH normalized AS (
    SELECT
      CASE
        WHEN lower(COALESCE(p_grouping, 'monthly')) = 'weekly' THEN 'week'
        ELSE 'month'
      END AS bucket,
      GREATEST(COALESCE(p_months, 12), 1) AS months_window
  ),
  filtered AS (
    SELECT
      transactions.date,
      transactions.type,
      transactions.amount,
      date_trunc(
        (SELECT bucket FROM normalized),
        transactions.date
      ) AS period_start
    FROM transactions
    WHERE transactions.user_id = auth.uid()
      AND transactions.type IN ('income', 'expense')
      AND transactions.date >= (
        date_trunc('month', now())
        - make_interval(months => ((SELECT months_window FROM normalized) - 1))
      )
  )
  SELECT
    filtered.period_start,
    CASE
      WHEN (SELECT bucket FROM normalized) = 'week'
        THEN filtered.period_start + interval '1 week'
      ELSE filtered.period_start + interval '1 month'
    END AS period_end,
    COALESCE(
      SUM(filtered.amount) FILTER (WHERE filtered.type = 'income'),
      0
    ) AS income,
    COALESCE(
      SUM(filtered.amount) FILTER (WHERE filtered.type = 'expense'),
      0
    ) AS expense,
    COALESCE(
      SUM(filtered.amount) FILTER (WHERE filtered.type = 'income'),
      0
    ) - COALESCE(
      SUM(filtered.amount) FILTER (WHERE filtered.type = 'expense'),
      0
    ) AS net,
    COUNT(*) AS transaction_count
  FROM filtered
  GROUP BY filtered.period_start
  ORDER BY filtered.period_start ASC;
$$;
