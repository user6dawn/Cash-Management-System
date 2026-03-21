'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Plus, Loader2, Wallet } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

type AccountType = 'cash' | 'bank' | 'savings' | 'investment'

type Account = {
  id: string
  name: string
  type: AccountType
  currency: string
  initial_balance: number | string
  created_at: string
}

const accountTypes: Array<{ label: string; value: AccountType }> = [
  { label: 'Cash', value: 'cash' },
  { label: 'Bank', value: 'bank' },
  { label: 'Savings', value: 'savings' },
  { label: 'Investment', value: 'investment' },
]

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
})

export default function AccountsPage() {
  const { user, loading } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('cash')
  const [initialBalance, setInitialBalance] = useState('')

  useEffect(() => {
    const fetchAccounts = async () => {
      if (loading) {
        return
      }

      if (!user) {
        setAccounts([])
        setAccountsLoading(false)
        return
      }

      setAccountsLoading(true)
      setError('')

      const supabase = createClient()
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type, currency, initial_balance, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message || 'Failed to load accounts.')
        setAccounts([])
      } else {
        setAccounts((data ?? []) as Account[])
      }

      setAccountsLoading(false)
    }

    fetchAccounts()
  }, [user, loading])

  const resetForm = () => {
    setName('')
    setType('cash')
    setInitialBalance('')
    setFormError('')
  }

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      setFormError('You must be logged in to add an account.')
      return
    }

    const parsedInitialBalance =
      initialBalance.trim() === '' ? 0 : Number(initialBalance)

    if (Number.isNaN(parsedInitialBalance)) {
      setFormError('Initial balance must be a valid number.')
      return
    }

    setSubmitting(true)
    setFormError('')

    const supabase = createClient()
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: user.id,
        name: name.trim(),
        type,
        initial_balance: parsedInitialBalance,
      })
      .select('id, name, type, currency, initial_balance, created_at')
      .single()

    if (error) {
      setFormError(error.message || 'Failed to create account.')
      setSubmitting(false)
      return
    }

    setAccounts((current) => [data as Account, ...current])
    resetForm()
    setDialogOpen(false)
    setSubmitting(false)
  }

  if (loading || accountsLoading) {
    return (
      <div className="space-y-6 p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            Add and manage the financial accounts tied to your profile.
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              resetForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Account</DialogTitle>
              <DialogDescription>
                Create a new account with its opening balance in NGN.
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleCreateAccount}>
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="account-name">Name</Label>
                <Input
                  id="account-name"
                  placeholder="e.g. Main Bank Account"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-type">Type</Label>
                <Select
                  value={type}
                  onValueChange={(value: AccountType) => setType(value)}
                  disabled={submitting}
                >
                  <SelectTrigger id="account-type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((accountType) => (
                      <SelectItem key={accountType.value} value={accountType.value}>
                        {accountType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial-balance">Initial Balance</Label>
                <Input
                  id="initial-balance"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={initialBalance}
                  onChange={(event) => setInitialBalance(event.target.value)}
                  disabled={submitting}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setDialogOpen(false)
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
          <CardDescription>
            Each account shows its type and starting balance only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed bg-slate-50/60 px-6 text-center dark:bg-slate-900/40">
              <div className="mb-4 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
                <Wallet className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold">No accounts yet</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Add your first account to start organizing your cash, bank, savings,
                or investment records.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Initial Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell className="capitalize">{account.type}</TableCell>
                    <TableCell className="text-right">
                      {currencyFormatter.format(Number(account.initial_balance) || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
