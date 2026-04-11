'use client'

import { useEffect, useMemo, useState } from 'react'
import { addMonths, format, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Percent,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/errors'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type AccountBalance = {
  account_id: string
  account_name: string
  account_type: string
  balance: number | string
  income_total: number | string
  expense_total: number | string
}

type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer_in'
  | 'transfer_out'
  | 'investment_buy'
  | 'investment_sell'

type Transaction = {
  id: string
  account_id: string
  amount: number | string
  type: TransactionType
  date: string
  category: string | null
  source: string | null
  description: string | null
}

type RawTransaction = {
  id: unknown
  account_id: unknown
  amount: unknown
  type: unknown
  date: unknown
  category: unknown
  source: unknown
  description: unknown
}

type InvestmentSummary = {
  asset_id: string
  name: string
  symbol: string
  current_value: number | string
  total_invested: number | string
  profit_loss: number | string
}

type AnalysisGrouping = 'weekly' | 'monthly'

type AnalysisView = 'weekly' | 'monthly' | 'threeMonths' | 'sixMonths'

type AnalysisViewConfig = {
  title: string
  grouping: AnalysisGrouping
  windowMonths?: 3 | 6
  summaryPrefix: string
  comparisonLabel: string
  rangeLabel: string
  emptyStateLabel: string
  insightsLabel: string
  bestLabel: string
  worstLabel: string
  netExplanation: string
}

type PeriodMetric = {
  key: string
  label: string
  shortLabel: string
  income: number
  expense: number
  net: number
  transactionCount: number
}

type BreakdownItem = {
  label: string
  value: number
  fill: string
  share: number
}

type AccountMetric = {
  accountId: string
  label: string
  income: number
  expense: number
  net: number
}

type AnalysisDataset = {
  metrics: PeriodMetric[]
  chartMetrics: PeriodMetric[]
  latest: PeriodMetric | null
  previous: PeriodMetric | null
  incomeBreakdown: BreakdownItem[]
  expenseBreakdown: BreakdownItem[]
  accountMetrics: AccountMetric[]
  best: PeriodMetric | null
  worst: PeriodMetric | null
  topIncomeSource: BreakdownItem | null
  topExpenseCategory: BreakdownItem | null
}

type CashflowPeriodMetricRow = {
  period_start: string
  period_end: string
  income: number | string
  expense: number | string
  net: number | string
  transaction_count: number | string
}

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const compactNumberFormatter = new Intl.NumberFormat('en-NG', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const percentFormatter = new Intl.NumberFormat('en-NG', {
  style: 'percent',
  maximumFractionDigits: 1,
})

const breakdownColors = ['#87E64B', '#181818', '#16A34A', '#F59E0B', '#2563EB', '#E11D48']

const cashFlowChartConfig: ChartConfig = {
  income: {
    label: 'Earned',
    color: '#16A34A',
  },
  expense: {
    label: 'Spent',
    color: '#E11D48',
  },
}

const netChartConfig: ChartConfig = {
  net: {
    label: 'Net',
    color: '#181818',
  },
}

const singleSeriesChartConfig: ChartConfig = {
  value: {
    label: 'Amount',
    color: '#87E64B',
  },
}

const analysisViewConfigs: Record<AnalysisView, AnalysisViewConfig> = {
  weekly: {
    title: 'Weekly',
    grouping: 'weekly',
    summaryPrefix: 'Latest Weekly',
    comparisonLabel: 'week',
    rangeLabel: 'weeks',
    emptyStateLabel: 'weekly',
    insightsLabel: 'weekly analysis',
    bestLabel: 'Best Week',
    worstLabel: 'Toughest Week',
    netExplanation: 'Positive net means you kept more than you spent in that week.',
  },
  monthly: {
    title: 'Monthly',
    grouping: 'monthly',
    summaryPrefix: 'Latest Monthly',
    comparisonLabel: 'month',
    rangeLabel: 'months',
    emptyStateLabel: 'monthly',
    insightsLabel: 'monthly analysis',
    bestLabel: 'Best Month',
    worstLabel: 'Toughest Month',
    netExplanation: 'Positive net means you kept more than you spent in that month.',
  },
  threeMonths: {
    title: '3 Months',
    grouping: 'monthly',
    windowMonths: 3,
    summaryPrefix: 'Last 3 Months',
    comparisonLabel: '3-month range',
    rangeLabel: 'months',
    emptyStateLabel: '3 month',
    insightsLabel: 'last 3 months',
    bestLabel: 'Best Month In Range',
    worstLabel: 'Toughest Month In Range',
    netExplanation:
      'Positive net means you kept more than you spent in each month inside the selected range.',
  },
  sixMonths: {
    title: '6 Months',
    grouping: 'monthly',
    windowMonths: 6,
    summaryPrefix: 'Last 6 Months',
    comparisonLabel: '6-month range',
    rangeLabel: 'months',
    emptyStateLabel: '6 month',
    insightsLabel: 'last 6 months',
    bestLabel: 'Best Month In Range',
    worstLabel: 'Toughest Month In Range',
    netExplanation:
      'Positive net means you kept more than you spent in each month inside the selected range.',
  },
}

function mapTransaction(row: RawTransaction): Transaction {
  const normalizedType: TransactionType =
    row.type === 'income' ||
    row.type === 'expense' ||
    row.type === 'transfer_in' ||
    row.type === 'transfer_out' ||
    row.type === 'investment_buy' ||
    row.type === 'investment_sell'
      ? row.type
      : 'expense'

  return {
    id: String(row.id ?? ''),
    account_id: String(row.account_id ?? ''),
    amount: (row.amount as number | string) ?? 0,
    type: normalizedType,
    date: String(row.date ?? ''),
    category: row.category == null ? null : String(row.category),
    source: row.source == null ? null : String(row.source),
    description: row.description == null ? null : String(row.description),
  }
}

function isTrackedCashFlowType(type: TransactionType) {
  return type === 'income' || type === 'expense'
}

function getLatestTrackedTransactionDate(transactions: Transaction[]) {
  let latestTimestamp = Number.NaN

  for (const transaction of transactions) {
    if (!isTrackedCashFlowType(transaction.type)) {
      continue
    }

    const transactionTimestamp = new Date(transaction.date).getTime()

    if (Number.isNaN(transactionTimestamp)) {
      continue
    }

    if (Number.isNaN(latestTimestamp) || transactionTimestamp > latestTimestamp) {
      latestTimestamp = transactionTimestamp
    }
  }

  return Number.isNaN(latestTimestamp) ? null : new Date(latestTimestamp)
}

function filterTransactionsByRange(
  transactions: Transaction[],
  start: Date,
  endExclusive: Date
) {
  return transactions.filter((transaction) => {
    if (!isTrackedCashFlowType(transaction.type)) {
      return false
    }

    const transactionDate = new Date(transaction.date)

    if (Number.isNaN(transactionDate.getTime())) {
      return false
    }

    return transactionDate >= start && transactionDate < endExclusive
  })
}

function buildSummaryMetric(transactions: Transaction[], label: string) {
  if (transactions.length === 0) {
    return null
  }

  let income = 0
  let expense = 0
  let transactionCount = 0

  for (const transaction of transactions) {
    const amount = Number(transaction.amount || 0)

    if (Number.isNaN(amount) || !isTrackedCashFlowType(transaction.type)) {
      continue
    }

    if (transaction.type === 'income') {
      income += amount
    }

    if (transaction.type === 'expense') {
      expense += amount
    }

    transactionCount += 1
  }

  return {
    key: label,
    label,
    shortLabel: label,
    income,
    expense,
    net: income - expense,
    transactionCount,
  }
}

function getRollingWindowLabel(start: Date, windowMonths: number) {
  const end = subMonths(addMonths(start, windowMonths), 1)

  return `${format(start, 'MMM yyyy')} - ${format(end, 'MMM yyyy')}`
}

function getPeriodStart(date: Date, period: AnalysisGrouping) {
  return period === 'weekly'
    ? startOfWeek(date, { weekStartsOn: 1 })
    : startOfMonth(date)
}

function getPeriodKey(date: Date, period: AnalysisGrouping) {
  return getPeriodStart(date, period).toISOString()
}

function formatPeriodLabel(date: Date, period: AnalysisGrouping) {
  if (period === 'weekly') {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    return `${format(start, 'dd MMM')} - ${format(end, 'dd MMM')}`
  }

  return format(date, 'MMMM yyyy')
}

function formatPeriodShortLabel(date: Date, period: AnalysisGrouping) {
  if (period === 'weekly') {
    return format(startOfWeek(date, { weekStartsOn: 1 }), 'dd MMM')
  }

  return format(date, 'MMM yy')
}

function formatCompactCurrency(value: number) {
  const absoluteValue = Math.abs(value)

  return `${value < 0 ? '-' : ''}NGN ${compactNumberFormatter.format(absoluteValue)}`
}

function getSavingsRate(income: number, expense: number) {
  if (income <= 0) {
    return null
  }

  return ((income - expense) / income) * 100
}

function formatSavingsRate(rate: number | null) {
  if (rate == null) {
    return 'N/A'
  }

  return percentFormatter.format(rate / 100)
}

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? '+' : '-'}${currencyFormatter.format(Math.abs(value))}`
}

function getCurrencyChangeLabel(current: number, previous: number, periodLabel: string) {
  const normalizedLabel = periodLabel.toLowerCase()

  if (previous === 0 && current === 0) {
    return `No change from previous ${normalizedLabel}`
  }

  if (previous === 0) {
    return `Started activity in this ${normalizedLabel}`
  }

  const delta = current - previous

  return `${delta >= 0 ? '+' : '-'}${currencyFormatter.format(Math.abs(delta))} vs previous ${normalizedLabel}`
}

function getRateChangeLabel(current: number | null, previous: number | null, periodLabel: string) {
  const normalizedLabel = periodLabel.toLowerCase()

  if (current == null && previous == null) {
    return 'No income recorded yet'
  }

  if (current == null) {
    return `No income in this ${normalizedLabel}`
  }

  if (previous == null) {
    return `First recorded ${normalizedLabel}`
  }

  const delta = current - previous

  return `${delta >= 0 ? '+' : '-'}${Math.abs(delta).toFixed(1)} pts vs previous ${normalizedLabel}`
}

function buildBreakdown(transactions: Transaction[], type: 'income' | 'expense') {
  const totals = new Map<string, number>()

  for (const transaction of transactions) {
    if (transaction.type !== type) {
      continue
    }

    const amount = Number(transaction.amount || 0)

    if (Number.isNaN(amount) || amount <= 0) {
      continue
    }

    const label =
      type === 'income'
        ? transaction.source?.trim() || transaction.category?.trim() || 'Other income'
        : transaction.category?.trim() || transaction.description?.trim() || 'Other expense'

    totals.set(label, (totals.get(label) ?? 0) + amount)
  }

  const sortedItems = Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)

  if (sortedItems.length === 0) {
    return []
  }

  const primaryItems = sortedItems.slice(0, 5)
  const remainingValue = sortedItems
    .slice(5)
    .reduce((sum, item) => sum + item.value, 0)
  const combinedItems =
    remainingValue > 0
      ? [...primaryItems, { label: 'Other', value: remainingValue }]
      : primaryItems
  const totalValue = combinedItems.reduce((sum, item) => sum + item.value, 0)

  return combinedItems.map((item, index) => ({
    ...item,
    fill: breakdownColors[index % breakdownColors.length],
    share: totalValue > 0 ? item.value / totalValue : 0,
  }))
}

function buildAccountMetrics(transactions: Transaction[], accountsById: Map<string, string>) {
  const totals = new Map<string, AccountMetric>()

  for (const transaction of transactions) {
    if (transaction.type !== 'income' && transaction.type !== 'expense') {
      continue
    }

    const amount = Number(transaction.amount || 0)

    if (Number.isNaN(amount)) {
      continue
    }

    const accountId = transaction.account_id || 'unknown-account'
    const existing = totals.get(accountId) ?? {
      accountId,
      label: accountsById.get(accountId) ?? 'Unknown account',
      income: 0,
      expense: 0,
      net: 0,
    }

    if (transaction.type === 'income') {
      existing.income += amount
    }

    if (transaction.type === 'expense') {
      existing.expense += amount
    }

    existing.net = existing.income - existing.expense
    totals.set(accountId, existing)
  }

  return Array.from(totals.values())
    .sort(
      (left, right) =>
        right.income + right.expense - (left.income + left.expense)
    )
    .slice(0, 6)
}

function buildAnalysisDataset(
  periodMetrics: PeriodMetric[],
  transactions: Transaction[],
  accountBalances: AccountBalance[],
  config: AnalysisViewConfig
): AnalysisDataset {
  const accountsById = new Map(
    accountBalances.map((account) => [account.account_id, account.account_name])
  )
  const allMetrics = periodMetrics
  let metrics = allMetrics
  let latest = metrics.length > 0 ? metrics[metrics.length - 1] : null
  let previous = metrics.length > 1 ? metrics[metrics.length - 2] : null
  const latestKey = latest?.key
  let focusTransactions = latest
    ? transactions.filter((transaction) => {
        if (!isTrackedCashFlowType(transaction.type)) {
          return false
        }

        const transactionDate = new Date(transaction.date)

        if (Number.isNaN(transactionDate.getTime())) {
          return false
        }

        return getPeriodKey(transactionDate, config.grouping) === latestKey
      })
    : []

  if (config.windowMonths) {
    const anchorDate = getLatestTrackedTransactionDate(transactions)

    if (anchorDate) {
      const currentWindowStart = startOfMonth(
        subMonths(anchorDate, config.windowMonths - 1)
      )
      const currentWindowEnd = startOfMonth(
        addMonths(currentWindowStart, config.windowMonths)
      )
      const previousWindowStart = startOfMonth(
        subMonths(currentWindowStart, config.windowMonths)
      )

      metrics = allMetrics.filter((metric) => {
        const metricDate = new Date(metric.key)

        if (Number.isNaN(metricDate.getTime())) {
          return false
        }

        return metricDate >= currentWindowStart && metricDate < currentWindowEnd
      })

      focusTransactions = filterTransactionsByRange(
        transactions,
        currentWindowStart,
        currentWindowEnd
      )

      const previousWindowTransactions = filterTransactionsByRange(
        transactions,
        previousWindowStart,
        currentWindowStart
      )

      latest = buildSummaryMetric(
        focusTransactions,
        getRollingWindowLabel(currentWindowStart, config.windowMonths)
      )
      previous = buildSummaryMetric(
        previousWindowTransactions,
        getRollingWindowLabel(previousWindowStart, config.windowMonths)
      )
    } else {
      metrics = []
      latest = null
      previous = null
      focusTransactions = []
    }
  }

  const incomeBreakdown = buildBreakdown(focusTransactions, 'income')
  const expenseBreakdown = buildBreakdown(focusTransactions, 'expense')
  const accountMetrics = buildAccountMetrics(focusTransactions, accountsById)
  const best =
    metrics.length > 0
      ? [...metrics].sort((left, right) => right.net - left.net)[0]
      : null
  const worst =
    metrics.length > 0
      ? [...metrics].sort((left, right) => left.net - right.net)[0]
      : null

  return {
    metrics,
    chartMetrics: config.windowMonths ? metrics : metrics.slice(-8),
    latest,
    previous,
    incomeBreakdown,
    expenseBreakdown,
    accountMetrics,
    best,
    worst,
    topIncomeSource: incomeBreakdown.length > 0 ? incomeBreakdown[0] : null,
    topExpenseCategory: expenseBreakdown.length > 0 ? expenseBreakdown[0] : null,
  }
}

function mapPeriodMetrics(
  rows: CashflowPeriodMetricRow[],
  grouping: AnalysisGrouping
): PeriodMetric[] {
  return rows
    .map((row) => {
      const periodDate = new Date(row.period_start)
      const income = Number(row.income || 0)
      const expense = Number(row.expense || 0)
      const transactionCount = Number(row.transaction_count || 0)

      if (Number.isNaN(periodDate.getTime())) {
        return null
      }

      return {
        key: periodDate.toISOString(),
        label: formatPeriodLabel(periodDate, grouping),
        shortLabel: formatPeriodShortLabel(periodDate, grouping),
        income,
        expense,
        net: Number(row.net || income - expense),
        transactionCount,
      } as PeriodMetric
    })
    .filter((metric): metric is PeriodMetric => Boolean(metric))
    .sort((left, right) => new Date(left.key).getTime() - new Date(right.key).getTime())
}

function getRecentActivityTone(type: TransactionType) {
  if (type === 'income' || type === 'transfer_in' || type === 'investment_sell') {
    return 'text-emerald-600'
  }

  if (type === 'expense' || type === 'transfer_out' || type === 'investment_buy') {
    return 'text-rose-600'
  }

  return 'text-[#181818]'
}

function formatRecentActivityAmount(type: TransactionType, amount: number | string) {
  const numericAmount = Number(amount || 0)
  const sign =
    type === 'income' || type === 'transfer_in' || type === 'investment_sell'
      ? '+'
      : type === 'expense' || type === 'transfer_out' || type === 'investment_buy'
        ? '-'
        : ''

  return `${sign}${currencyFormatter.format(numericAmount)}`
}

export default function AnalyticsPage() {
  const { user, loading, authError } = useAuth()
  const analysisWindowMonths = 6
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<AnalysisView>('weekly')
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [investments, setInvestments] = useState<InvestmentSummary[]>([])
  const [weeklyMetrics, setWeeklyMetrics] = useState<PeriodMetric[]>([])
  const [monthlyMetrics, setMonthlyMetrics] = useState<PeriodMetric[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (loading) {
        return
      }

      if (!user) {
        setAccountBalances([])
        setTransactions([])
        setInvestments([])
        setWeeklyMetrics([])
        setMonthlyMetrics([])
        setPageLoading(false)
        return
      }

      setPageLoading(true)
      setError('')

      try {
        const supabase = createClient()
        const transactionsStartDate = startOfMonth(
          subMonths(new Date(), analysisWindowMonths - 1)
        ).toISOString()
        const [
          { data: balancesData, error: balancesError },
          { data: transactionsData, error: transactionsError },
          { data: investmentsData, error: investmentsError },
          { data: weeklyMetricsData, error: weeklyMetricsError },
          { data: monthlyMetricsData, error: monthlyMetricsError },
        ] = await Promise.all([
          supabase.rpc('get_account_balances'),
          supabase
            .from('transactions')
            .select('id, account_id, amount, type, date, category, source, description')
            .gte('date', transactionsStartDate)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase.rpc('get_investment_asset_summaries'),
          supabase.rpc('get_cashflow_period_metrics', {
            p_grouping: 'weekly',
            p_months: analysisWindowMonths,
          }),
          supabase.rpc('get_cashflow_period_metrics', {
            p_grouping: 'monthly',
            p_months: analysisWindowMonths,
          }),
        ])

        if (balancesError || transactionsError || investmentsError || weeklyMetricsError || monthlyMetricsError) {
          setError(
            balancesError?.message ||
              transactionsError?.message ||
              investmentsError?.message ||
              weeklyMetricsError?.message ||
              monthlyMetricsError?.message ||
              'Failed to load analytics.'
          )
          setAccountBalances([])
          setTransactions([])
          setInvestments([])
          setWeeklyMetrics([])
          setMonthlyMetrics([])
        } else {
          setAccountBalances((balancesData ?? []) as AccountBalance[])
          setTransactions(
            ((transactionsData ?? []) as RawTransaction[]).map((row) =>
              mapTransaction(row)
            )
          )
          setInvestments((investmentsData ?? []) as InvestmentSummary[])
          setWeeklyMetrics(
            mapPeriodMetrics(
              (weeklyMetricsData ?? []) as CashflowPeriodMetricRow[],
              'weekly'
            )
          )
          setMonthlyMetrics(
            mapPeriodMetrics(
              (monthlyMetricsData ?? []) as CashflowPeriodMetricRow[],
              'monthly'
            )
          )
        }
      } catch (error) {
        setError(getErrorMessage(error, 'Failed to load analytics.'))
        setAccountBalances([])
        setTransactions([])
        setInvestments([])
        setWeeklyMetrics([])
        setMonthlyMetrics([])
      }

      setPageLoading(false)
    }

    fetchAnalytics()
  }, [user, loading, analysisWindowMonths])

  const totalBalance = useMemo(
    () => accountBalances.reduce((sum, account) => sum + Number(account.balance || 0), 0),
    [accountBalances]
  )

  const totalIncome = useMemo(
    () => accountBalances.reduce((sum, account) => sum + Number(account.income_total || 0), 0),
    [accountBalances]
  )

  const totalExpense = useMemo(
    () => accountBalances.reduce((sum, account) => sum + Number(account.expense_total || 0), 0),
    [accountBalances]
  )

  const netSavings = totalIncome - totalExpense
  const overallSavingsRate = getSavingsRate(totalIncome, totalExpense)

  const totalInvestmentValue = useMemo(
    () => investments.reduce((sum, investment) => sum + Number(investment.current_value || 0), 0),
    [investments]
  )

  const totalInvestmentProfit = useMemo(
    () => investments.reduce((sum, investment) => sum + Number(investment.profit_loss || 0), 0),
    [investments]
  )

  const recentActivity = useMemo(() => transactions.slice(0, 8), [transactions])

  const topAccounts = useMemo(
    () =>
      [...accountBalances]
        .sort((left, right) => Number(right.balance || 0) - Number(left.balance || 0))
        .slice(0, 4),
    [accountBalances]
  )

  const topInvestments = useMemo(
    () =>
      [...investments]
        .sort(
          (left, right) =>
            Number(right.current_value || 0) - Number(left.current_value || 0)
        )
        .slice(0, 4),
    [investments]
  )

  const weeklyAnalysis = useMemo(
    () =>
      buildAnalysisDataset(
        weeklyMetrics,
        transactions,
        accountBalances,
        analysisViewConfigs.weekly
      ),
    [weeklyMetrics, transactions, accountBalances]
  )
  const monthlyAnalysis = useMemo(
    () =>
      buildAnalysisDataset(
        monthlyMetrics,
        transactions,
        accountBalances,
        analysisViewConfigs.monthly
      ),
    [monthlyMetrics, transactions, accountBalances]
  )
  const threeMonthsAnalysis = useMemo(
    () =>
      buildAnalysisDataset(
        monthlyMetrics,
        transactions,
        accountBalances,
        analysisViewConfigs.threeMonths
      ),
    [monthlyMetrics, transactions, accountBalances]
  )
  const sixMonthsAnalysis = useMemo(
    () =>
      buildAnalysisDataset(
        monthlyMetrics,
        transactions,
        accountBalances,
        analysisViewConfigs.sixMonths
      ),
    [monthlyMetrics, transactions, accountBalances]
  )

  const renderAnalysisSection = (
    analysis: AnalysisDataset,
    viewConfig: AnalysisViewConfig
  ) => {
    const periodTitle = viewConfig.title

    if (!analysis.latest) {
      return (
        <Card className="border-[#181818]/10 shadow-sm shadow-[#87E64B]/5">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 rounded-full bg-[#87E64B]/15 p-3">
              <BarChart3 className="h-6 w-6 text-[#181818]" />
            </div>
            <p className="text-lg font-semibold">
              No {viewConfig.emptyStateLabel} income or expense analysis yet
            </p>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Add income or expense transactions to unlock {viewConfig.emptyStateLabel} charts,
              detailed earned versus loss tracking, and deeper range summaries.
            </p>
          </CardContent>
        </Card>
      )
    }

    const latestSavingsRate = getSavingsRate(
      analysis.latest.income,
      analysis.latest.expense
    )
    const previousSavingsRate = analysis.previous
      ? getSavingsRate(analysis.previous.income, analysis.previous.expense)
      : null
    const scorecardRows = [...analysis.metrics].slice(-6).reverse()
    const chartIdPrefix = periodTitle.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-[#87E64B]/25 shadow-sm shadow-[#87E64B]/5">
            <CardHeader className="pb-2">
              <CardDescription>{viewConfig.summaryPrefix} Earned</CardDescription>
              <CardTitle>{currencyFormatter.format(analysis.latest.income)}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-emerald-600">
              <ArrowUpRight className="h-4 w-4" />
              {getCurrencyChangeLabel(
                analysis.latest.income,
                analysis.previous?.income ?? 0,
                viewConfig.comparisonLabel
              )}
            </CardContent>
          </Card>

          <Card className="border-[#87E64B]/25 shadow-sm shadow-[#87E64B]/5">
            <CardHeader className="pb-2">
              <CardDescription>{viewConfig.summaryPrefix} Spent</CardDescription>
              <CardTitle>{currencyFormatter.format(analysis.latest.expense)}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-rose-600">
              <ArrowDownRight className="h-4 w-4" />
              {getCurrencyChangeLabel(
                analysis.latest.expense,
                analysis.previous?.expense ?? 0,
                viewConfig.comparisonLabel
              )}
            </CardContent>
          </Card>

          <Card className="border-[#87E64B]/25 shadow-sm shadow-[#87E64B]/5">
            <CardHeader className="pb-2">
              <CardDescription>{viewConfig.summaryPrefix} Net</CardDescription>
              <CardTitle>{currencyFormatter.format(analysis.latest.net)}</CardTitle>
            </CardHeader>
            <CardContent
              className={`flex items-center gap-2 text-sm ${
                analysis.latest.net >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              <PiggyBank className="h-4 w-4" />
              {getCurrencyChangeLabel(
                analysis.latest.net,
                analysis.previous?.net ?? 0,
                viewConfig.comparisonLabel
              )}
            </CardContent>
          </Card>

          <Card className="border-[#87E64B]/25 shadow-sm shadow-[#87E64B]/5">
            <CardHeader className="pb-2">
              <CardDescription>{viewConfig.summaryPrefix} Savings Rate</CardDescription>
              <CardTitle>{formatSavingsRate(latestSavingsRate)}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <Percent className="h-4 w-4" />
              {getRateChangeLabel(
                latestSavingsRate,
                previousSavingsRate,
                viewConfig.comparisonLabel
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-[#181818]/10 shadow-sm shadow-[#87E64B]/5">
            <CardHeader>
              <CardTitle>{periodTitle} Income vs Expense</CardTitle>
              <CardDescription>
                Showing the last {analysis.chartMetrics.length} tracked {viewConfig.rangeLabel}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={cashFlowChartConfig}
                className="!aspect-auto h-[320px] w-full"
              >
                <AreaChart
                  data={analysis.chartMetrics}
                  margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id={`${chartIdPrefix}-income`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id={`${chartIdPrefix}-expense`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCompactCurrency(Number(value))}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
                        formatter={(value, name) => (
                          <div className="flex w-full items-center justify-between gap-3">
                            <span className="text-muted-foreground">
                              {name === 'income' ? 'Earned' : 'Spent'}
                            </span>
                            <span className="font-medium text-foreground">
                              {currencyFormatter.format(Number(value) || 0)}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    fill={`url(#${chartIdPrefix}-income)`}
                    stroke="var(--color-income)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    fill={`url(#${chartIdPrefix}-expense)`}
                    stroke="var(--color-expense)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-[#181818]/10 shadow-sm shadow-[#87E64B]/5">
            <CardHeader>
              <CardTitle>{periodTitle} Net Trend</CardTitle>
              <CardDescription>{viewConfig.netExplanation}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={netChartConfig}
                className="!aspect-auto h-[320px] w-full"
              >
                <BarChart
                  data={analysis.chartMetrics}
                  margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCompactCurrency(Number(value))}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
                        formatter={(value) => (
                          <div className="flex w-full items-center justify-between gap-3">
                            <span className="text-muted-foreground">Net</span>
                            <span className="font-medium text-foreground">
                              {currencyFormatter.format(Number(value) || 0)}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="net">
                    {analysis.chartMetrics.map((metric) => (
                      <Cell
                        key={metric.key}
                        fill={metric.net >= 0 ? '#16A34A' : '#E11D48'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-[#181818]/10 shadow-sm shadow-[#87E64B]/5">
            <CardHeader>
              <CardTitle>{periodTitle} Income Sources</CardTitle>
              <CardDescription>
                Where earned money came from during {analysis.latest.label}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.incomeBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No income was recorded during {analysis.latest.label}.
                </p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(220px,1fr)] lg:items-center">
                  <ChartContainer
                    config={singleSeriesChartConfig}
                    className="mx-auto !aspect-auto h-[280px] w-full max-w-[320px]"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            hideLabel
                            formatter={(value, _name, item) => (
                              <div className="flex w-full items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                  {item.payload.label}
                                </span>
                                <span className="font-medium text-foreground">
                                  {currencyFormatter.format(Number(value) || 0)}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Pie
                        data={analysis.incomeBreakdown}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={70}
                        paddingAngle={4}
                      >
                        {analysis.incomeBreakdown.map((item) => (
                          <Cell key={item.label} fill={item.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>

                  <div className="space-y-3">
                    {analysis.incomeBreakdown.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-lg border border-[#87E64B]/20 bg-[#87E64B]/8 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          />
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {percentFormatter.format(item.share)}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold">
                          {currencyFormatter.format(item.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#181818]/10 shadow-sm shadow-[#87E64B]/5">
            <CardHeader>
              <CardTitle>{periodTitle} Expense Breakdown</CardTitle>
              <CardDescription>
                What drove losses and spending during {analysis.latest.label}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.expenseBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No expenses were recorded during {analysis.latest.label}.
                </p>
              ) : (
                <ChartContainer
                  config={singleSeriesChartConfig}
                  className="!aspect-auto h-[320px] w-full"
                >
                  <BarChart
                    data={analysis.expenseBreakdown}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 12, bottom: 8 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => formatCompactCurrency(Number(value))}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="label"
                      type="category"
                      width={120}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, _name, item) => (
                            <div className="flex w-full items-center justify-between gap-3">
                              <span className="text-muted-foreground">
                                {item.payload.label}
                              </span>
                              <span className="font-medium text-foreground">
                                {currencyFormatter.format(Number(value) || 0)}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="value" radius={8}>
                      {analysis.expenseBreakdown.map((item) => (
                        <Cell key={item.label} fill={item.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-[#181818]/10 shadow-sm shadow-[#87E64B]/5">
            <CardHeader>
              <CardTitle>{periodTitle} Account Performance</CardTitle>
              <CardDescription>
                Income and expense totals by account for {analysis.latest.label}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.accountMetrics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No account-level income or expense data is available for this period.
                </p>
              ) : (
                <ChartContainer
                  config={cashFlowChartConfig}
                  className="!aspect-auto h-[320px] w-full"
                >
                  <BarChart
                    data={analysis.accountMetrics}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 12, bottom: 8 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => formatCompactCurrency(Number(value))}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="label"
                      type="category"
                      width={120}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, name, item) => (
                            <div className="flex w-full items-center justify-between gap-3">
                              <span className="text-muted-foreground">
                                {item.payload.label} {name === 'income' ? 'earned' : 'spent'}
                              </span>
                              <span className="font-medium text-foreground">
                                {currencyFormatter.format(Number(value) || 0)}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="income" fill="var(--color-income)" radius={6} />
                    <Bar dataKey="expense" fill="var(--color-expense)" radius={6} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#181818]/10 shadow-sm shadow-[#87E64B]/5">
            <CardHeader>
              <CardTitle>{periodTitle} Insights</CardTitle>
              <CardDescription>
                Quick highlights pulled from your {viewConfig.insightsLabel}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#87E64B]/20 bg-[#87E64B]/8 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Focus Period
                </p>
                <p className="mt-2 font-semibold">{analysis.latest.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {analysis.latest.transactionCount} income and expense transaction
                  {analysis.latest.transactionCount === 1 ? '' : 's'}
                </p>
              </div>

              <div className="rounded-lg border border-[#87E64B]/20 bg-[#87E64B]/8 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {viewConfig.bestLabel}
                </p>
                <p className="mt-2 font-semibold">
                  {analysis.best?.label || 'No data yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {analysis.best
                    ? `Net ${formatSignedCurrency(analysis.best.net)}`
                    : 'No best period yet'}
                </p>
              </div>

              <div className="rounded-lg border border-[#87E64B]/20 bg-[#87E64B]/8 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {viewConfig.worstLabel}
                </p>
                <p className="mt-2 font-semibold">
                  {analysis.worst?.label || 'No data yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {analysis.worst
                    ? `Net ${formatSignedCurrency(analysis.worst.net)}`
                    : 'No toughest period yet'}
                </p>
              </div>

              <div className="rounded-lg border border-[#87E64B]/20 bg-[#87E64B]/8 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Strongest Income Source
                </p>
                <p className="mt-2 font-semibold">
                  {analysis.topIncomeSource?.label || 'No income source yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {analysis.topIncomeSource
                    ? currencyFormatter.format(analysis.topIncomeSource.value)
                    : `No income recorded in this ${viewConfig.comparisonLabel}`}
                </p>
              </div>

              <div className="rounded-lg border border-[#87E64B]/20 bg-[#87E64B]/8 p-4 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Biggest Expense Driver
                </p>
                <p className="mt-2 font-semibold">
                  {analysis.topExpenseCategory?.label || 'No expense category yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {analysis.topExpenseCategory
                    ? currencyFormatter.format(analysis.topExpenseCategory.value)
                    : `No expenses recorded in this ${viewConfig.comparisonLabel}`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-[#181818]/10 shadow-sm shadow-[#87E64B]/5">
          <CardHeader>
            <CardTitle>{periodTitle} Scorecard</CardTitle>
            <CardDescription>
              Compare how much was earned, spent, and kept across recent {viewConfig.rangeLabel}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scorecardRows.map((metric) => (
              <div
                key={metric.key}
                className="grid gap-4 rounded-lg border border-[#87E64B]/20 bg-[#87E64B]/8 p-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]"
              >
                <div>
                  <p className="font-medium">{metric.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {metric.transactionCount} tracked transaction
                    {metric.transactionCount === 1 ? '' : 's'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Earned
                  </p>
                  <p className="mt-2 font-semibold text-emerald-600">
                    {currencyFormatter.format(metric.income)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Spent
                  </p>
                  <p className="mt-2 font-semibold text-rose-600">
                    {currencyFormatter.format(metric.expense)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Net
                  </p>
                  <p
                    className={`mt-2 font-semibold ${
                      metric.net >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {currencyFormatter.format(metric.net)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading || pageLoading) {
    return (
      <div className="space-y-8 p-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="rounded-lg border border-[#87E64B]/100 bg-[#87E64B]/10 p-4 text-[#181818]">
        <h1 className="text-3xl font-bold tracking-tight text-[#181818]">Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          A deeper view of your balances, cash flow, investment value, and period-by-period
          performance.
        </p>
      </div>

      {authError && (
        <Alert>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Card className="border-[#87E64B]/25 shadow-sm shadow-[#87E64B]/5">
          <CardHeader className="pb-2">
            <CardDescription>Total Balance</CardDescription>
            <CardTitle>{currencyFormatter.format(totalBalance)}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Across all accounts
          </CardContent>
        </Card>

        <Card className="border-[#87E64B]/25 shadow-sm shadow-[#87E64B]/5">
          <CardHeader className="pb-2">
            <CardDescription>Total Income</CardDescription>
            <CardTitle>{currencyFormatter.format(totalIncome)}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-emerald-600">
            <TrendingUp className="h-4 w-4" />
            Recorded inflows
          </CardContent>
        </Card>

        <Card className="border-[#87E64B]/25 shadow-sm shadow-[#87E64B]/5">
          <CardHeader className="pb-2">
            <CardDescription>Total Expense</CardDescription>
            <CardTitle>{currencyFormatter.format(totalExpense)}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-rose-600">
            <TrendingDown className="h-4 w-4" />
            Recorded outflows
          </CardContent>
        </Card>

        <Card className="border-[#87E64B]/25 shadow-sm shadow-[#87E64B]/5">
          <CardHeader className="pb-2">
            <CardDescription>Net Savings</CardDescription>
            <CardTitle>{currencyFormatter.format(netSavings)}</CardTitle>
          </CardHeader>
          <CardContent
            className={`flex items-center gap-2 text-sm ${
              netSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            <PiggyBank className="h-4 w-4" />
            Savings rate {formatSavingsRate(overallSavingsRate)}
          </CardContent>
        </Card>

        <Card className="border-[#87E64B]/25 shadow-sm shadow-[#87E64B]/5">
          <CardHeader className="pb-2">
            <CardDescription>Investment Value</CardDescription>
            <CardTitle>{currencyFormatter.format(totalInvestmentValue)}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            Current holdings value
          </CardContent>
        </Card>

        <Card className="border-[#87E64B]/25 shadow-sm shadow-[#87E64B]/5">
          <CardHeader className="pb-2">
            <CardDescription>Investment Profit or Loss</CardDescription>
            <CardTitle>{currencyFormatter.format(totalInvestmentProfit)}</CardTitle>
          </CardHeader>
          <CardContent
            className={`flex items-center gap-2 text-sm ${
              totalInvestmentProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            <Percent className="h-4 w-4" />
            Live portfolio result
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#181818]/10 shadow-sm shadow-[#87E64B]/5">
        <CardHeader className="space-y-4">
          <div className="space-y-1">
            <CardTitle>Detailed Cash Flow Analysis</CardTitle>
            <CardDescription>
              Switch between weekly, monthly, last 3 months, and last 6 months
              views to see how much was earned, spent, and kept over time.
              Transfers and investment trades stay out of these cash flow charts
              so internal movement does not distort the analysis.
            </CardDescription>
          </div>

          <Tabs
            value={activeAnalysisTab}
            onValueChange={(value) => setActiveAnalysisTab(value as AnalysisView)}
            className="w-full"
          >
            <TabsList className="grid h-auto w-full max-w-[640px] grid-cols-2 gap-1 bg-[#87E64B]/15 p-1 md:grid-cols-4">
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="threeMonths">3 Months</TabsTrigger>
              <TabsTrigger value="sixMonths">6 Months</TabsTrigger>
            </TabsList>

            {activeAnalysisTab === 'weekly' && (
              <TabsContent value="weekly" className="mt-6">
                {renderAnalysisSection(weeklyAnalysis, analysisViewConfigs.weekly)}
              </TabsContent>
            )}

            {activeAnalysisTab === 'monthly' && (
              <TabsContent value="monthly" className="mt-6">
                {renderAnalysisSection(monthlyAnalysis, analysisViewConfigs.monthly)}
              </TabsContent>
            )}

            {activeAnalysisTab === 'threeMonths' && (
              <TabsContent value="threeMonths" className="mt-6">
                {renderAnalysisSection(
                  threeMonthsAnalysis,
                  analysisViewConfigs.threeMonths
                )}
              </TabsContent>
            )}

            {activeAnalysisTab === 'sixMonths' && (
              <TabsContent value="sixMonths" className="mt-6">
                {renderAnalysisSection(
                  sixMonthsAnalysis,
                  analysisViewConfigs.sixMonths
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-[#181818]/10 shadow-sm shadow-[#87E64B]/5">
          <CardHeader>
            <CardTitle>Top Accounts</CardTitle>
            <CardDescription>
              Highest balances based on your current account calculations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add accounts and transactions to see account analytics.
              </p>
            ) : (
              <div className="space-y-3">
                {topAccounts.map((account) => (
                  <div
                    key={account.account_id}
                    className="flex items-center justify-between rounded-lg border border-[#87E64B]/20 bg-[#87E64B]/8 p-4"
                  >
                    <div>
                      <p className="font-medium">{account.account_name}</p>
                      <p className="text-sm capitalize text-muted-foreground">
                        {account.account_type}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {currencyFormatter.format(Number(account.balance) || 0)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#181818]/10 shadow-sm shadow-[#87E64B]/5">
          <CardHeader>
            <CardTitle>Top Investments</CardTitle>
            <CardDescription>
              Your biggest holdings by current portfolio value.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topInvestments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add investment entries to see portfolio analytics.
              </p>
            ) : (
              <div className="space-y-3">
                {topInvestments.map((investment) => (
                  <div
                    key={investment.asset_id}
                    className="flex items-center justify-between rounded-lg border border-[#87E64B]/20 bg-[#87E64B]/8 p-4"
                  >
                    <div>
                      <p className="font-medium">{investment.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {investment.symbol}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {currencyFormatter.format(
                          Number(investment.current_value) || 0
                        )}
                      </p>
                      <p
                        className={`text-sm ${
                          Number(investment.profit_loss) >= 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {currencyFormatter.format(
                          Number(investment.profit_loss) || 0
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#181818]/10 shadow-sm shadow-[#87E64B]/5">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            The latest transactions captured across your accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add transactions to see recent activity here.
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border border-[#87E64B]/20 bg-[#87E64B]/8 p-4"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {transaction.type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dateFormatter.format(new Date(transaction.date))}
                    </p>
                  </div>
                  <p className={`font-semibold ${getRecentActivityTone(transaction.type)}`}>
                    {formatRecentActivityAmount(transaction.type, transaction.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
