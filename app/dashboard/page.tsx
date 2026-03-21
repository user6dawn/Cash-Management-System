'use client'

import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type AccountBalance = {
  account_id: string
  account_name: string
  account_type: string
  currency: string
  initial_balance: number | string
  income_total: number | string
  expense_total: number | string
  balance: number | string
}

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
})

export default function DashboardPage() {
  const { user, userData, loading } = useAuth()
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([])
  const [balancesLoading, setBalancesLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    const fetchBalances = async () => {
      if (loading) {
        return
      }

      if (!user) {
        setAccountBalances([])
        setBalancesLoading(false)
        return
      }

      setBalancesLoading(true)
      setError('')

      const { data, error } = await supabase.rpc('get_account_balances')

      if (error) {
        setError(error.message || 'Failed to load balances.')
        setAccountBalances([])
      } else {
        setAccountBalances((data ?? []) as AccountBalance[])
      }

      setBalancesLoading(false)
    }

    fetchBalances()

    if (!user) {
      return
    }

    const channel = supabase
      .channel(`dashboard-balances-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBalances()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBalances()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, loading])

  const totalBalance = accountBalances.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0
  )

  if (loading || balancesLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {userData?.full_name || 'User'}
        </h1>
        <p className="text-muted-foreground mt-2">
          Here&apos;s a live view of your calculated account balances.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <CardDescription>Across all accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {currencyFormatter.format(totalBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Account Balances</h2>
          <p className="text-sm text-muted-foreground">
            Each balance is calculated from initial balance plus income minus expense.
          </p>
        </div>

        {accountBalances.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
                <Wallet className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </div>
              <p className="text-lg font-semibold">No balances to display</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Add accounts and transactions to see live balances here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {accountBalances.map((account) => (
              <Card key={account.account_id}>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg">{account.account_name}</CardTitle>
                  <CardDescription className="capitalize">
                    {account.account_type} account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {currencyFormatter.format(Number(account.balance) || 0)}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Initial balance {currencyFormatter.format(Number(account.initial_balance) || 0)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            Balances are always calculated in real time and never stored separately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              1
            </div>
            <div>
              <p className="font-medium">Start with the account&apos;s initial balance</p>
              <p className="text-sm text-muted-foreground">
                Every account begins from the opening balance you entered.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              2
            </div>
            <div>
              <p className="font-medium">Apply incoming money</p>
              <p className="text-sm text-muted-foreground">
                Income and transfer-in records increase the account balance automatically.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              3
            </div>
            <div>
              <p className="font-medium">Subtract outgoing money</p>
              <p className="text-sm text-muted-foreground">
                Expenses and transfer-out records reduce the balance and refresh the dashboard live.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
