'use client'

import { FormEvent, useEffect, useState } from 'react'
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Repeat,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/errors'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Account = {
  id: string
  name: string
  type: string
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
  amount: number | string
  type: TransactionType
  date: string
  category: string | null
  source: string | null
  description: string | null
  asset_id?: string | null
  reference_id: string | null
  remarks: string | null
  account: {
    id: string
    name: string
    type: string
  } | null
}

const transactionTypes: Array<{ label: string; value: 'income' | 'expense' }> = [
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
]

const transactionTypeLabels: Record<TransactionType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  investment_buy: 'Investment Buy',
  investment_sell: 'Investment Sell',
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

export default function TransactionsPage() {
  const itemsPerPage = 8
  const { user, loading, authError } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [transferError, setTransferError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [accountFilter, setAccountFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [accountId, setAccountId] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [source, setSource] = useState('')
  const [description, setDescription] = useState('')
  const [remarks, setRemarks] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDate, setTransferDate] = useState('')
  const [transferRemarks, setTransferRemarks] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      if (loading) {
        return
      }

      if (!user) {
        setAccounts([])
        setTransactions([])
        setPageLoading(false)
        return
      }

      setPageLoading(true)
      setError('')

      try {
        const supabase = createClient()
        const [{ data: accountsData, error: accountsError }, { data: transactionsData, error: transactionsError }] = await Promise.all([
          supabase.from('accounts').select('id, name, type').order('name', { ascending: true }),
          supabase
            .from('transactions')
            .select('id, amount, type, date, category, source, description, asset_id, reference_id, remarks, account:accounts(id, name, type)')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false }),
        ])

        if (accountsError || transactionsError) {
          setError(accountsError?.message || transactionsError?.message || 'Failed to load transactions.')
          setAccounts([])
          setTransactions([])
        } else {
          setAccounts((accountsData ?? []) as Account[])
          setTransactions((transactionsData ?? []) as Transaction[])
        }
      } catch (error) {
        setError(getErrorMessage(error, 'Failed to load transactions.'))
        setAccounts([])
        setTransactions([])
      }

      setPageLoading(false)
    }

    fetchData()
  }, [user, loading])

  const resetForm = () => {
    setAccountId('')
    setType('expense')
    setAmount('')
    setDate('')
    setCategory('')
    setSource('')
    setDescription('')
    setRemarks('')
    setFormError('')
  }

  const resetTransferForm = () => {
    setFromAccountId('')
    setToAccountId('')
    setTransferAmount('')
    setTransferDate('')
    setTransferRemarks('')
    setTransferError('')
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, accountFilter, typeFilter, startDateFilter, endDateFilter])

  const categorySuggestions = Array.from(
    new Set(
      transactions
        .map((transaction) => transaction.category?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right))

  const sourceSuggestions = Array.from(
    new Set(
      transactions
        .map((transaction) => transaction.source?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right))

  const filteredTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.date)
    const normalizedSearch = searchQuery.trim().toLowerCase()

    const matchesSearch =
      normalizedSearch === '' ||
      [
        transaction.account?.name,
        transaction.category,
        transaction.source,
        transaction.description,
        transaction.remarks,
        transactionTypeLabels[transaction.type],
        String(transaction.amount),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch))

    const matchesAccount =
      accountFilter === 'all' || transaction.account?.id === accountFilter

    const matchesType =
      typeFilter === 'all' || transaction.type === typeFilter

    const matchesStartDate =
      startDateFilter === '' ||
      transactionDate >= new Date(`${startDateFilter}T00:00:00`)

    const matchesEndDate =
      endDateFilter === '' ||
      transactionDate <= new Date(`${endDateFilter}T23:59:59`)

    return (
      matchesSearch &&
      matchesAccount &&
      matchesType &&
      matchesStartDate &&
      matchesEndDate
    )
  })

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage))
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const clearFilters = () => {
    setSearchQuery('')
    setAccountFilter('all')
    setTypeFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
    setCurrentPage(1)
  }

  const openTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setDetailsOpen(true)
  }

  const handleCreateTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      setFormError('You must be logged in to add a transaction.')
      return
    }

    if (!accountId) {
      setFormError('Please select an account.')
      return
    }

    const parsedAmount = Number(amount)

    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setFormError('Amount must be a valid non-negative number.')
      return
    }

    if (!date) {
      setFormError('Please choose a transaction date.')
      return
    }

    if (type === 'income' && source.trim() === '') {
      setFormError('Source is required for income transactions.')
      return
    }

    if (type === 'expense' && description.trim() === '') {
      setFormError('Description is required for expense transactions.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const supabase = createClient()
      const selectedAccount = accounts.find((account) => account.id === accountId) || null
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: accountId,
          type,
          amount: parsedAmount,
          date: new Date(date).toISOString(),
          category: category.trim() || null,
          source: type === 'income' ? source.trim() : null,
          description: type === 'expense' ? description.trim() : null,
          asset_id: null,
          reference_id: null,
          remarks: remarks.trim() || null,
        })
        .select('id, amount, type, date, category, source, description, asset_id, reference_id, remarks')
        .single()

      if (error) {
        setFormError(error.message || 'Failed to create transaction.')
        setSubmitting(false)
        return
      }

      setTransactions((current) => [
        {
          ...(data as Omit<Transaction, 'account'>),
          account: selectedAccount,
        },
        ...current,
      ])
      resetForm()
      setDialogOpen(false)
      setSubmitting(false)
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to create transaction.'))
      setSubmitting(false)
    }
  }

  const handleCreateTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      setTransferError('You must be logged in to create a transfer.')
      return
    }

    if (!fromAccountId || !toAccountId) {
      setTransferError('Please select both the source and destination accounts.')
      return
    }

    if (fromAccountId === toAccountId) {
      setTransferError('Source and destination accounts must be different.')
      return
    }

    const parsedAmount = Number(transferAmount)

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setTransferError('Transfer amount must be greater than zero.')
      return
    }

    if (!transferDate) {
      setTransferError('Please choose a transfer date.')
      return
    }

    const fromAccount = accounts.find((account) => account.id === fromAccountId) || null
    const toAccount = accounts.find((account) => account.id === toAccountId) || null

    if (!fromAccount || !toAccount) {
      setTransferError('Selected accounts could not be found.')
      return
    }

    setSubmitting(true)
    setTransferError('')

    try {
      const referenceId = crypto.randomUUID()
      const transferDateIso = new Date(transferDate).toISOString()
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            account_id: fromAccountId,
            type: 'transfer_out',
            amount: parsedAmount,
            date: transferDateIso,
            category: 'Transfer',
            source: null,
            description: null,
            asset_id: null,
            reference_id: referenceId,
            remarks: transferRemarks.trim() || `Transfer to ${toAccount.name}`,
          },
          {
            user_id: user.id,
            account_id: toAccountId,
            type: 'transfer_in',
            amount: parsedAmount,
            date: transferDateIso,
            category: 'Transfer',
            source: null,
            description: null,
            asset_id: null,
            reference_id: referenceId,
            remarks: transferRemarks.trim() || `Transfer from ${fromAccount.name}`,
          },
        ])
        .select('id, account_id, amount, type, date, category, source, description, asset_id, reference_id, remarks')

      if (error) {
        setTransferError(error.message || 'Failed to create transfer.')
        setSubmitting(false)
        return
      }

      const accountsById = new Map(accounts.map((account) => [account.id, account]))
      const mappedTransfers = ((data ?? []) as Array<Omit<Transaction, 'account'> & { account_id: string }>).map((transaction) => ({
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        category: transaction.category,
        source: transaction.source,
        description: transaction.description,
        asset_id: transaction.asset_id,
        reference_id: transaction.reference_id,
        remarks: transaction.remarks,
        account: accountsById.get(transaction.account_id) || null,
      }))

      setTransactions((current) =>
        [...mappedTransfers, ...current].sort(
          (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
        )
      )
      resetTransferForm()
      setTransferDialogOpen(false)
      setSubmitting(false)
    } catch (error) {
      setTransferError(getErrorMessage(error, 'Failed to create transfer.'))
      setSubmitting(false)
    }
  }

  if (loading || pageLoading) {
    return (
      <div className="space-y-6 p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="text-[#181818] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border border-[#87E64B]/100 bg-[#87E64B]/10 p-4 rounded-lg">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Record income, expenses, transfers, and investment-linked activity across your accounts.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Dialog
            open={transferDialogOpen}
            onOpenChange={(open) => {
              setTransferDialogOpen(open)
              if (!open) {
                resetTransferForm()
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" disabled={accounts.length < 2}>
                <Repeat className="mr-2 h-4 w-4" />
                Transfer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer Funds</DialogTitle>
                <DialogDescription>
                  Move money between your accounts by creating linked transfer records.
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4" onSubmit={handleCreateTransfer}>
                {transferError && (
                  <Alert variant="destructive">
                    <AlertDescription>{transferError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="transfer-from-account">From account</Label>
                  <Select value={fromAccountId} onValueChange={setFromAccountId} disabled={submitting}>
                    <SelectTrigger id="transfer-from-account">
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer-to-account">To account</Label>
                  <Select value={toAccountId} onValueChange={setToAccountId} disabled={submitting}>
                    <SelectTrigger id="transfer-to-account">
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer-amount">Amount</Label>
                  <Input
                    id="transfer-amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(event) => setTransferAmount(event.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer-date">Date</Label>
                  <Input
                    id="transfer-date"
                    type="datetime-local"
                    value={transferDate}
                    onChange={(event) => setTransferDate(event.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer-remarks">Remarks</Label>
                  <Input
                    id="transfer-remarks"
                    placeholder="Optional note for this transfer"
                    value={transferRemarks}
                    onChange={(event) => setTransferRemarks(event.target.value)}
                    disabled={submitting}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetTransferForm()
                      setTransferDialogOpen(false)
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Transfer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

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
              <Button disabled={accounts.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
                <DialogDescription>
                  Save an income or expense entry for one of your accounts.
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4" onSubmit={handleCreateTransaction}>
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="transaction-account">Account</Label>
                  <Select value={accountId} onValueChange={setAccountId} disabled={submitting}>
                    <SelectTrigger id="transaction-account">
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transaction-type">Type</Label>
                  <Select
                    value={type}
                    onValueChange={(value: 'income' | 'expense') => setType(value)}
                    disabled={submitting}
                  >
                    <SelectTrigger id="transaction-type">
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionTypes.map((transactionType) => (
                        <SelectItem key={transactionType.value} value={transactionType.value}>
                          {transactionType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transaction-amount">Amount</Label>
                  <Input
                    id="transaction-amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transaction-date">Date</Label>
                  <Input
                    id="transaction-date"
                    type="datetime-local"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-category">Category</Label>
                <Input
                  id="transaction-category"
                  list="transaction-category-suggestions"
                  placeholder="Optional category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  disabled={submitting}
                />
                <datalist id="transaction-category-suggestions">
                  {categorySuggestions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>

              {type === 'income' ? (
                <div className="space-y-2">
                  <Label htmlFor="transaction-source">Source</Label>
                  <Input
                    id="transaction-source"
                    list="transaction-source-suggestions"
                    placeholder="Salary, freelance, interest..."
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                    required
                    disabled={submitting}
                  />
                  <datalist id="transaction-source-suggestions">
                    {sourceSuggestions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
              ) : (
                  <div className="space-y-2">
                    <Label htmlFor="transaction-description">Description</Label>
                    <Input
                      id="transaction-description"
                      placeholder="Groceries, transport, rent..."
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="transaction-remarks">Remarks</Label>
                  <Input
                    id="transaction-remarks"
                    placeholder="Optional remarks"
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
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
                    Save Transaction
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open)
          if (!open) {
            setSelectedTransaction(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Review the full details for this transaction.
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Amount</CardDescription>
                    <CardTitle className="text-2xl">
                      {currencyFormatter.format(Number(selectedTransaction.amount) || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Type</CardDescription>
                    <CardTitle className="text-lg">
                      {transactionTypeLabels[selectedTransaction.type]}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border bg-slate-50/70 p-4 dark:bg-slate-900/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Account
                  </p>
                  <p className="mt-2 font-medium">
                    {selectedTransaction.account?.name || 'Unknown account'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTransaction.account?.type || 'Account type unavailable'}
                  </p>
                </div>

                <div className="rounded-lg border bg-slate-50/70 p-4 dark:bg-slate-900/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date
                  </p>
                  <p className="mt-2 font-medium">
                    {dateFormatter.format(new Date(selectedTransaction.date))}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Recorded as ISO: {selectedTransaction.date}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Category
                  </p>
                  <p className="mt-2 text-sm">
                    {selectedTransaction.category || 'Not provided'}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Source
                  </p>
                  <p className="mt-2 text-sm">
                    {selectedTransaction.source || 'Not provided'}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-2 text-sm">
                    {selectedTransaction.description || 'Not provided'}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Remarks
                  </p>
                  <p className="mt-2 text-sm">
                    {selectedTransaction.remarks || 'Not provided'}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Reference ID
                  </p>
                  <p className="mt-2 break-all font-mono text-sm">
                    {selectedTransaction.reference_id || 'Not linked'}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Asset ID
                  </p>
                  <p className="mt-2 break-all font-mono text-sm">
                    {selectedTransaction.asset_id || 'Not linked'}
                  </p>
                </div>
              </div>

              {selectedTransaction.reference_id && (
                <div className="rounded-lg border border-dashed bg-slate-50/70 p-4 text-sm text-muted-foreground dark:bg-slate-900/40">
                  This transaction is linked to another record through reference ID
                  {' '}
                  <span className="font-mono text-foreground">
                    {selectedTransaction.reference_id}
                  </span>
                  .
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Your Transactions</CardTitle>
            <CardDescription>
              Search, filter, and page through all recorded activity quickly.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border bg-slate-50/70 p-4 dark:bg-slate-900/40">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
              <div className="space-y-2">
                <Label htmlFor="transaction-search">Search Transactions</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="transaction-search"
                    className="pl-9"
                    placeholder="Search account, category, source, description..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-filter">Account</Label>
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger id="account-filter">
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type-filter">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {Object.entries(transactionTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date-filter">From</Label>
                <Input
                  id="start-date-filter"
                  type="date"
                  value={startDateFilter}
                  onChange={(event) => setStartDateFilter(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date-filter">To</Label>
                <Input
                  id="end-date-filter"
                  type="date"
                  value={endDateFilter}
                  onChange={(event) => setEndDateFilter(event.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <SlidersHorizontal className="h-4 w-4" />
                <span>
                  Showing {filteredTransactions.length} result
                  {filteredTransactions.length === 1 ? '' : 's'}
                </span>
              </div>
              <Button type="button" variant="ghost" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear filters
              </Button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed bg-slate-50/60 px-6 text-center dark:bg-slate-900/40">
              <div className="mb-4 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
                <ArrowLeftRight className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold">No accounts available</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Add an account first before recording transactions or transfers.
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed bg-slate-50/60 px-6 text-center dark:bg-slate-900/40">
              <div className="mb-4 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
                <ArrowLeftRight className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold">No matching transactions</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Try widening your filters or clearing the search to see more results.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-slate-900/50">
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((transaction) => (
                      <TableRow
                        key={transaction.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer transition-colors hover:bg-slate-50/80 focus:bg-slate-50/80 focus:outline-none dark:hover:bg-slate-900/50 dark:focus:bg-slate-900/50"
                        onClick={() => openTransactionDetails(transaction)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            openTransactionDetails(transaction)
                          }
                        }}
                      >
                        <TableCell className="font-medium">
                          {currencyFormatter.format(Number(transaction.amount) || 0)}
                        </TableCell>
                        <TableCell>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {transactionTypeLabels[transaction.type]}
                          </span>
                        </TableCell>
                        <TableCell>{transaction.account?.name || 'Unknown account'}</TableCell>
                        <TableCell>{dateFormatter.format(new Date(transaction.date))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
