'use client'

import { useEffect, useState } from 'react'
import { BarChart3, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/errors'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type AccountBalance = {
  account_id: string
  account_name: string
  account_type: string
  balance: number | string
  income_total: number | string
  expense_total: number | string
}

type Transaction = {
  id: string
  amount: number | string
  type:
    | 'income'
    | 'expense'
    | 'transfer_in'
    | 'transfer_out'
    | 'investment_buy'
    | 'investment_sell'
  date: string
}

type InvestmentSummary = {
  asset_id: string
  name: string
  symbol: string
  current_value: number | string
  total_invested: number | string
  profit_loss: number | string
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

export default function AnalyticsPage() {
  const { user, loading, authError } = useAuth()
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [investments, setInvestments] = useState<InvestmentSummary[]>([])
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
        setPageLoading(false)
        return
      }

      setPageLoading(true)
      setError('')

      try {
        const supabase = createClient()
        const [
          { data: balancesData, error: balancesError },
          { data: transactionsData, error: transactionsError },
          { data: investmentsData, error: investmentsError },
        ] = await Promise.all([
          supabase.rpc('get_account_balances'),
          supabase
            .from('transactions')
            .select('id, amount, type, date')
            .order('date', { ascending: false }),
          supabase.rpc('get_investment_asset_summaries'),
        ])

        if (balancesError || transactionsError || investmentsError) {
          setError(
            balancesError?.message ||
              transactionsError?.message ||
              investmentsError?.message ||
              'Failed to load analytics.'
          )
          setAccountBalances([])
          setTransactions([])
          setInvestments([])
        } else {
          setAccountBalances((balancesData ?? []) as AccountBalance[])
          setTransactions((transactionsData ?? []) as Transaction[])
          setInvestments((investmentsData ?? []) as InvestmentSummary[])
        }
      } catch (error) {
        setError(getErrorMessage(error, 'Failed to load analytics.'))
        setAccountBalances([])
        setTransactions([])
        setInvestments([])
      }

      setPageLoading(false)
    }

    fetchAnalytics()
  }, [user, loading])

  const totalBalance = accountBalances.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0
  )

  const totalIncome = accountBalances.reduce(
    (sum, account) => sum + Number(account.income_total || 0),
    0
  )

  const totalExpense = accountBalances.reduce(
    (sum, account) => sum + Number(account.expense_total || 0),
    0
  )

  const totalInvestmentValue = investments.reduce(
    (sum, investment) => sum + Number(investment.current_value || 0),
    0
  )

  const totalInvestmentProfit = investments.reduce(
    (sum, investment) => sum + Number(investment.profit_loss || 0),
    0
  )

  const recentActivity = transactions.slice(0, 8)

  const topAccounts = [...accountBalances]
    .sort((left, right) => Number(right.balance || 0) - Number(left.balance || 0))
    .slice(0, 4)

  const topInvestments = [...investments]
    .sort(
      (left, right) =>
        Number(right.current_value || 0) - Number(left.current_value || 0)
    )
    .slice(0, 4)

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
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="rounded-2xl border border-[#87E64B]/30 bg-white/85 p-6 shadow-sm shadow-[#87E64B]/10 backdrop-blur">
        <h1 className="text-3xl font-bold tracking-tight text-[#181818]">Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          A live summary of the accounts, transactions, and investments you&apos;ve added.
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <CardDescription>Investment Value</CardDescription>
            <CardTitle>{currencyFormatter.format(totalInvestmentValue)}</CardTitle>
          </CardHeader>
          <CardContent
            className={`flex items-center gap-2 text-sm ${
              totalInvestmentProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Profit {currencyFormatter.format(totalInvestmentProfit)}
          </CardContent>
        </Card>
      </div>

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
              Your biggest holdings by current placeholder value.
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
                  <p className="font-semibold">
                    {currencyFormatter.format(Number(transaction.amount) || 0)}
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
