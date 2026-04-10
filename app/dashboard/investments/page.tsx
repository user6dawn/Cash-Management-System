'use client'

import { FormEvent, useEffect, useState } from 'react'
import { LineChart, Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react'
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

type Account = {
  id: string
  name: string
  type: string
}

type Asset = {
  id: string
  name: string
  symbol: string
  type: string
  created_at: string
}

type AssetSummary = {
  asset_id: string
  name: string
  symbol: string
  asset_type: string
  description: string | null
  created_at: string
  first_investment_date: string
  holding_days: number
  units_held: number | string
  total_fees: number | string
  total_invested: number | string
  average_buy_price: number | string
  placeholder_price: number | string
  current_value: number | string
  profit_loss: number | string
}

type AssetDetailEntry = {
  id: string
  quantity: number | string
  price_per_unit: number | string
  fees: number | string
  transaction: {
    id: string
    type: 'investment_buy' | 'investment_sell'
    date: string
    remarks: string | null
    account: {
      id: string
      name: string
    } | null
  } | null
}

type RawAssetDetailEntry = {
  id: unknown
  quantity: unknown
  price_per_unit: unknown
  fees: unknown
  transaction: {
    id: unknown
    type: unknown
    date: unknown
    remarks: unknown
    account: { id: unknown; name: unknown } | { id: unknown; name: unknown }[] | null
  } | {
    id: unknown
    type: unknown
    date: unknown
    remarks: unknown
    account: { id: unknown; name: unknown } | { id: unknown; name: unknown }[] | null
  }[] | null
}

function mapAssetDetailEntry(entry: RawAssetDetailEntry): AssetDetailEntry {
  const transaction = Array.isArray(entry.transaction) ? entry.transaction[0] : entry.transaction
  const account = transaction
    ? Array.isArray(transaction.account)
      ? transaction.account[0] ?? null
      : transaction.account
    : null

  return {
    id: String(entry.id ?? ''),
    quantity: (entry.quantity as number | string) ?? 0,
    price_per_unit: (entry.price_per_unit as number | string) ?? 0,
    fees: (entry.fees as number | string) ?? 0,
    transaction: transaction
      ? {
          id: String(transaction.id ?? ''),
          type:
            transaction.type === 'investment_sell' ? 'investment_sell' : 'investment_buy',
          date: String(transaction.date ?? ''),
          remarks:
            transaction.remarks == null ? null : String(transaction.remarks),
          account: account
            ? {
                id: String(account.id ?? ''),
                name: String(account.name ?? ''),
              }
            : null,
        }
      : null,
  }
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

export default function InvestmentsPage() {
  const { user, loading, authError } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetSummaries, setAssetSummaries] = useState<AssetSummary[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [detailsError, setDetailsError] = useState('')
  const [assetSubmitting, setAssetSubmitting] = useState(false)
  const [assetDialogOpen, setAssetDialogOpen] = useState(false)
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null)
  const [assetFormError, setAssetFormError] = useState('')
  const [editAssetName, setEditAssetName] = useState('')
  const [editAssetSymbol, setEditAssetSymbol] = useState('')
  const [editAssetType, setEditAssetType] = useState('')
  const [selectedAssetSummary, setSelectedAssetSummary] = useState<AssetSummary | null>(null)
  const [selectedAssetEntries, setSelectedAssetEntries] = useState<AssetDetailEntry[]>([])
  const [assetMode, setAssetMode] = useState<'existing' | 'new'>('existing')
  const [accountId, setAccountId] = useState('')
  const [assetId, setAssetId] = useState('')
  const [assetName, setAssetName] = useState('')
  const [assetSymbol, setAssetSymbol] = useState('')
  const [assetType, setAssetType] = useState('')
  const [entryType, setEntryType] = useState<'investment_buy' | 'investment_sell'>('investment_buy')
  const [quantity, setQuantity] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [fees, setFees] = useState('')
  const [date, setDate] = useState('')

  const portfolioTotals = assetSummaries.reduce(
    (summary, asset) => ({
      invested: summary.invested + (Number(asset.total_invested) || 0),
      value: summary.value + (Number(asset.current_value) || 0),
      profit: summary.profit + (Number(asset.profit_loss) || 0),
    }),
    { invested: 0, value: 0, profit: 0 }
  )

  const fetchData = async () => {
    if (loading) {
      return
    }

    if (!user) {
      setAccounts([])
      setAssets([])
      setAssetSummaries([])
      setPageLoading(false)
      return
    }

    setPageLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const [
        { data: accountsData, error: accountsError },
        { data: assetsData, error: assetsError },
        { data: summariesData, error: summariesError },
      ] = await Promise.all([
        supabase.from('accounts').select('id, name, type').order('name', { ascending: true }),
        supabase
          .from('investment_assets')
          .select('id, name, symbol, type, created_at')
          .order('created_at', { ascending: false }),
        supabase.rpc('get_investment_asset_summaries'),
      ])

      if (accountsError || assetsError || summariesError) {
        setError(
          accountsError?.message ||
            assetsError?.message ||
            summariesError?.message ||
            'Failed to load investments.'
        )
        setAccounts([])
        setAssets([])
        setAssetSummaries([])
      } else {
        setAccounts((accountsData ?? []) as Account[])
        setAssets((assetsData ?? []) as Asset[])
        setAssetSummaries((summariesData ?? []) as AssetSummary[])
      }
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to load investments.'))
      setAccounts([])
      setAssets([])
      setAssetSummaries([])
    }

    setPageLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [user, loading])

  const resetForm = () => {
    setAssetMode('existing')
    setAccountId('')
    setAssetId('')
    setAssetName('')
    setAssetSymbol('')
    setAssetType('')
    setEntryType('investment_buy')
    setQuantity('')
    setPricePerUnit('')
    setFees('')
    setDate('')
    setFormError('')
  }

  const openAssetDetails = async (asset: AssetSummary) => {
    setSelectedAssetSummary(asset)
    setSelectedAssetEntries([])
    setDetailsError('')
    setDetailsOpen(true)
    setDetailLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('investment_entries')
        .select(`
          id,
          quantity,
          price_per_unit,
          fees,
          transaction:transactions(
            id,
            type,
            date,
            remarks,
            account:accounts(id, name)
          )
        `)
        .eq('asset_id', asset.asset_id)
        .order('created_at', { ascending: false })

      if (error) {
        setDetailsError(error.message || 'Failed to load investment details.')
        setSelectedAssetEntries([])
      } else {
        setSelectedAssetEntries((data ?? []).map((entry) => mapAssetDetailEntry(entry as RawAssetDetailEntry)))
      }
    } catch (error) {
      setDetailsError(getErrorMessage(error, 'Failed to load investment details.'))
      setSelectedAssetEntries([])
    }

    setDetailLoading(false)
  }

  const handleCreateInvestment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      setFormError('You must be logged in to add an investment.')
      return
    }

    if (!accountId) {
      setFormError('Please select the account tied to this investment transaction.')
      return
    }

    if (assetMode === 'existing' && !assetId) {
      setFormError('Please select an asset.')
      return
    }

    if (assetMode === 'new' && (!assetName.trim() || !assetSymbol.trim() || !assetType.trim())) {
      setFormError('Please provide the new asset name, symbol, and type.')
      return
    }

    const parsedQuantity = Number(quantity)
    const parsedPricePerUnit = Number(pricePerUnit)
    const parsedFees = fees.trim() === '' ? 0 : Number(fees)

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setFormError('Quantity must be greater than zero.')
      return
    }

    if (Number.isNaN(parsedPricePerUnit) || parsedPricePerUnit < 0) {
      setFormError('Price per unit must be zero or greater.')
      return
    }

    if (Number.isNaN(parsedFees) || parsedFees < 0) {
      setFormError('Fees must be zero or greater.')
      return
    }

    if (!date) {
      setFormError('Please choose an investment date.')
      return
    }

    setSubmitting(true)
    setFormError('')

    const supabase = createClient()
    let resolvedAssetId = assetId
    let createdAsset: Asset | null = null

    if (assetMode === 'new') {
      const { data: assetData, error: assetError } = await supabase
        .from('investment_assets')
        .insert({
          user_id: user.id,
          name: assetName.trim(),
          symbol: assetSymbol.trim().toUpperCase(),
          type: assetType.trim(),
        })
        .select('id, name, symbol, type, created_at')
        .single()

      if (assetError) {
        setFormError(assetError.message || 'Failed to create asset.')
        setSubmitting(false)
        return
      }

      createdAsset = assetData as Asset
      resolvedAssetId = createdAsset.id
    }

    const grossAmount = parsedQuantity * parsedPricePerUnit
    const transactionAmount =
      entryType === 'investment_buy'
        ? grossAmount + parsedFees
        : Math.max(grossAmount - parsedFees, 0)

    const selectedAsset =
      createdAsset ||
      assets.find((asset) => asset.id === resolvedAssetId) ||
      null

    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id: accountId,
        type: entryType,
        amount: transactionAmount,
        date: new Date(date).toISOString(),
        category: 'Investment',
        source: null,
        description: null,
        asset_id: resolvedAssetId,
        reference_id: null,
        remarks:
          entryType === 'investment_buy'
            ? `Bought ${selectedAsset?.symbol || assetSymbol.trim().toUpperCase()}`
            : `Sold ${selectedAsset?.symbol || assetSymbol.trim().toUpperCase()}`,
      })
      .select('id')
      .single()

    if (transactionError) {
      setFormError(transactionError.message || 'Failed to create investment transaction.')
      setSubmitting(false)
      return
    }

    const { error: entryError } = await supabase
      .from('investment_entries')
      .insert({
        asset_id: resolvedAssetId,
        transaction_id: (transactionData as { id: string }).id,
        quantity: parsedQuantity,
        price_per_unit: parsedPricePerUnit,
        fees: parsedFees,
      })
      .select(`
        id,
        asset_id,
        quantity,
        price_per_unit,
        fees,
        transaction:transactions(
          id,
          type,
          date,
          account:accounts(id, name)
        )
      `)
      .single()

    if (entryError) {
      setFormError(entryError.message || 'Failed to create investment entry.')
      setSubmitting(false)
      return
    }

    resetForm()
    setDialogOpen(false)
    await fetchData()
    setSubmitting(false)
  }

  const resetAssetForm = () => {
    setEditingAssetId(null)
    setAssetFormError('')
    setEditAssetName('')
    setEditAssetSymbol('')
    setEditAssetType('')
  }

  const openEditAssetDialog = (assetSummary: AssetSummary) => {
    const matchingAsset = assets.find((asset) => asset.id === assetSummary.asset_id)
    setEditingAssetId(assetSummary.asset_id)
    setEditAssetName(assetSummary.name)
    setEditAssetSymbol(assetSummary.symbol)
    setEditAssetType(matchingAsset?.type || assetSummary.asset_type)
    setAssetFormError('')
    setAssetDialogOpen(true)
  }

  const handleUpdateAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editingAssetId) {
      setAssetFormError('No asset selected.')
      return
    }

    if (!editAssetName.trim() || !editAssetSymbol.trim() || !editAssetType.trim()) {
      setAssetFormError('Name, symbol, and type are required.')
      return
    }

    setAssetSubmitting(true)
    setAssetFormError('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('investment_assets')
        .update({
          name: editAssetName.trim(),
          symbol: editAssetSymbol.trim().toUpperCase(),
          type: editAssetType.trim(),
        })
        .eq('id', editingAssetId)

      if (error) {
        setAssetFormError(error.message || 'Failed to update asset.')
      } else {
        setAssetDialogOpen(false)
        resetAssetForm()
        await fetchData()
      }
    } catch (error) {
      setAssetFormError(getErrorMessage(error, 'Failed to update asset.'))
    }

    setAssetSubmitting(false)
  }

  const handleDeleteAsset = async (assetSummary: AssetSummary) => {
    const confirmed = window.confirm(
      `Delete "${assetSummary.name}"? This may fail if transactions depend on it.`
    )
    if (!confirmed) {
      return
    }

    setDeletingAssetId(assetSummary.asset_id)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('investment_assets')
        .delete()
        .eq('id', assetSummary.asset_id)

      if (error) {
        setError(error.message || 'Failed to delete asset.')
      } else {
        if (selectedAssetSummary?.asset_id === assetSummary.asset_id) {
          setDetailsOpen(false)
          setSelectedAssetSummary(null)
          setSelectedAssetEntries([])
        }
        await fetchData()
      }
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to delete asset.'))
    }

    setDeletingAssetId(null)
  }

  if (loading || pageLoading) {
    return (
      <div className="space-y-6 p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="text-[#181818] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border border-[#87E64B]/100 bg-[#87E64B]/10 p-4 rounded-lg">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Investments</h1>
          <p className="text-muted-foreground">
            Track your assets and record every buy or sell with a linked transaction.
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
            <Button disabled={accounts.length === 0}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Investment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Investment</DialogTitle>
              <DialogDescription>
                Record a buy or sell entry and create the linked account transaction.
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleCreateInvestment}>
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="investment-account">Account</Label>
                <Select value={accountId} onValueChange={setAccountId} disabled={submitting}>
                  <SelectTrigger id="investment-account">
                    <SelectValue placeholder="Select account" />
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
                <Label htmlFor="investment-asset-mode">Asset Mode</Label>
                <Select
                  value={assetMode}
                  onValueChange={(value: 'existing' | 'new') => setAssetMode(value)}
                  disabled={submitting}
                >
                  <SelectTrigger id="investment-asset-mode">
                    <SelectValue placeholder="Choose asset mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Select Existing Asset</SelectItem>
                    <SelectItem value="new">Create New Asset</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {assetMode === 'existing' ? (
                <div className="space-y-2">
                  <Label htmlFor="investment-asset">Asset</Label>
                  <Select value={assetId} onValueChange={setAssetId} disabled={submitting}>
                    <SelectTrigger id="investment-asset">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.symbol} - {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="asset-name">Asset Name</Label>
                    <Input
                      id="asset-name"
                      value={assetName}
                      onChange={(event) => setAssetName(event.target.value)}
                      placeholder="Apple Inc."
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asset-symbol">Symbol</Label>
                    <Input
                      id="asset-symbol"
                      value={assetSymbol}
                      onChange={(event) => setAssetSymbol(event.target.value)}
                      placeholder="AAPL"
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asset-type">Asset Type</Label>
                    <Input
                      id="asset-type"
                      value={assetType}
                      onChange={(event) => setAssetType(event.target.value)}
                      placeholder="stock, crypto, etf..."
                      disabled={submitting}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="investment-entry-type">Action</Label>
                <Select
                  value={entryType}
                  onValueChange={(value: 'investment_buy' | 'investment_sell') => setEntryType(value)}
                  disabled={submitting}
                >
                  <SelectTrigger id="investment-entry-type">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investment_buy">Buy</SelectItem>
                    <SelectItem value="investment_sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="investment-quantity">Quantity</Label>
                <Input
                  id="investment-quantity"
                  type="number"
                  inputMode="decimal"
                  step="0.00000001"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="0"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="investment-price">Price Per Unit</Label>
                <Input
                  id="investment-price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={pricePerUnit}
                  onChange={(event) => setPricePerUnit(event.target.value)}
                  placeholder="0.00"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="investment-fees">Fees</Label>
                <Input
                  id="investment-fees"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={fees}
                  onChange={(event) => setFees(event.target.value)}
                  placeholder="0.00"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="investment-date">Date</Label>
                <Input
                  id="investment-date"
                  type="datetime-local"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
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
                  Save Investment
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
        open={assetDialogOpen}
        onOpenChange={(open) => {
          setAssetDialogOpen(open)
          if (!open) {
            resetAssetForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update the asset details used across your investment records.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdateAsset}>
            {assetFormError && (
              <Alert variant="destructive">
                <AlertDescription>{assetFormError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-asset-name">Asset Name</Label>
              <Input
                id="edit-asset-name"
                value={editAssetName}
                onChange={(event) => setEditAssetName(event.target.value)}
                disabled={assetSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-asset-symbol">Symbol</Label>
              <Input
                id="edit-asset-symbol"
                value={editAssetSymbol}
                onChange={(event) => setEditAssetSymbol(event.target.value)}
                disabled={assetSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-asset-type">Asset Type</Label>
              <Input
                id="edit-asset-type"
                value={editAssetType}
                onChange={(event) => setEditAssetType(event.target.value)}
                disabled={assetSubmitting}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAssetDialogOpen(false)
                  resetAssetForm()
                }}
                disabled={assetSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assetSubmitting}>
                {assetSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invested</CardDescription>
            <CardTitle>{currencyFormatter.format(portfolioTotals.invested)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Value</CardDescription>
            <CardTitle>{currencyFormatter.format(portfolioTotals.value)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Profit</CardDescription>
            <CardTitle
              className={portfolioTotals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}
            >
              {currencyFormatter.format(portfolioTotals.profit)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open)
          if (!open) {
            setSelectedAssetSummary(null)
            setSelectedAssetEntries([])
            setDetailsError('')
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAssetSummary?.name || 'Investment Details'}
            </DialogTitle>
            <DialogDescription>
              Review the holding period, totals, and trade history for this asset.
            </DialogDescription>
          </DialogHeader>

          {selectedAssetSummary && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Symbol</CardDescription>
                    <CardTitle className="text-lg">{selectedAssetSummary.symbol}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Holding Days</CardDescription>
                    <CardTitle className="text-lg">
                      {selectedAssetSummary.holding_days}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Units Held</CardDescription>
                    <CardTitle className="text-lg">
                      {Number(selectedAssetSummary.units_held) || 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Fees</CardDescription>
                    <CardTitle className="text-lg">
                      {currencyFormatter.format(Number(selectedAssetSummary.total_fees) || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Invested</CardDescription>
                    <CardTitle className="text-lg">
                      {currencyFormatter.format(Number(selectedAssetSummary.total_invested) || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Avg Buy Price</CardDescription>
                    <CardTitle className="text-lg">
                      {currencyFormatter.format(Number(selectedAssetSummary.average_buy_price) || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Current Value</CardDescription>
                    <CardTitle className="text-lg">
                      {currencyFormatter.format(Number(selectedAssetSummary.current_value) || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Profit / Loss</CardDescription>
                    <CardTitle
                      className={`text-lg ${
                        Number(selectedAssetSummary.profit_loss) >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {currencyFormatter.format(Number(selectedAssetSummary.profit_loss) || 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {selectedAssetSummary.description && (
                <div className="rounded-lg border bg-slate-50/70 p-4 text-sm text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
                  {selectedAssetSummary.description}
                </div>
              )}

              {detailsError && (
                <Alert variant="destructive">
                  <AlertDescription>{detailsError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Trade History
                  </h3>
                </div>

                {detailLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : selectedAssetEntries.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    No investment entries found for this asset yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedAssetEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border bg-white p-4 dark:bg-slate-950"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium">
                              {entry.transaction?.type === 'investment_buy' ? 'Buy' : 'Sell'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {dateFormatter.format(
                                new Date(entry.transaction?.date || selectedAssetSummary.created_at)
                              )}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-medium">
                              {currencyFormatter.format(
                                (Number(entry.quantity) || 0) * (Number(entry.price_per_unit) || 0)
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Fees {currencyFormatter.format(Number(entry.fees) || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                          <p>Quantity: {Number(entry.quantity) || 0}</p>
                          <p>
                            Price/Unit: {currencyFormatter.format(Number(entry.price_per_unit) || 0)}
                          </p>
                          <p>Account: {entry.transaction?.account?.name || 'Unknown'}</p>
                        </div>
                        {entry.transaction?.remarks && (
                          <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                            {entry.transaction.remarks}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Your Assets</CardTitle>
          <CardDescription>
            Every card shows the current holding period and summary for each asset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assetSummaries.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed bg-slate-50/60 px-6 text-center dark:bg-slate-900/40">
              <div className="mb-4 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
                <LineChart className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </div>
              <h2 className="text-lg font-semibold">No assets yet</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Add your first investment asset and record a buy or sell entry to start tracking it.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {assetSummaries.map((asset) => (
                <Card key={asset.asset_id} className="h-full border-slate-200/80">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{asset.name}</CardTitle>
                        <CardDescription>
                          {asset.symbol} | <span className="capitalize">{asset.asset_type}</span>
                        </CardDescription>
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {asset.holding_days} day{asset.holding_days === 1 ? '' : 's'}
                      </div>
                    </div>
                    {asset.description && (
                      <p className="text-sm text-muted-foreground">{asset.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Units Held
                      </p>
                      <p className="mt-1 text-2xl font-semibold">
                        {Number(asset.units_held) || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Avg Price
                      </p>
                      <p className="mt-1 text-2xl font-semibold">
                        {currencyFormatter.format(Number(asset.average_buy_price) || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Current Value
                      </p>
                      <p className="mt-1 text-2xl font-semibold">
                        {currencyFormatter.format(Number(asset.current_value) || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Profit / Loss
                      </p>
                      <p
                        className={`mt-1 text-2xl font-semibold ${
                          Number(asset.profit_loss) >= 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {currencyFormatter.format(Number(asset.profit_loss) || 0)}
                      </p>
                    </div>
                    <div className="sm:col-span-2 flex flex-wrap justify-between gap-2 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => openAssetDetails(asset)}
                      >
                        View details
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditAssetDialog(asset)}
                          disabled={assetSubmitting || deletingAssetId === asset.asset_id}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteAsset(asset)}
                          disabled={assetSubmitting || deletingAssetId === asset.asset_id}
                        >
                          {deletingAssetId === asset.asset_id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
