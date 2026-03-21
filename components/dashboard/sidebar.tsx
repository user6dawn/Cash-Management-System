'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/contexts/auth-context'
import appIcon from '@/images/android-chrome-192x192.png'
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  ChartBar as BarChart3,
  LogOut,
  Loader2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Accounts', href: '/dashboard/accounts', icon: Wallet },
  { name: 'Transactions', href: '/dashboard/transactions', icon: ArrowLeftRight },
  { name: 'Investments', href: '/dashboard/investments', icon: TrendingUp },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
]

type SidebarNavProps = {
  collapsed?: boolean
  mobile?: boolean
  onNavigate?: () => void
}

function SidebarNav({ collapsed = false, mobile = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)

    try {
      const { error } = await signOut()

      if (!error) {
        onNavigate?.()
        window.location.href = '/login'
      }
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <>
      <nav className={cn('flex-1 space-y-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex rounded-lg py-2 text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-2' : 'items-center gap-3 px-3',
                isActive
                  ? 'bg-[#87E64B] text-[#181818]'
                  : 'text-white/70 hover:bg-[#87E64B]/12 hover:text-[#87E64B]'
              )}
              title={collapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5" />
              {!collapsed && item.name}
            </Link>
          )
        })}
      </nav>

      <div className={cn('border-t border-[#2a2a2a]', collapsed ? 'p-2' : 'p-4')}>
        <Button
          variant="ghost"
          className={cn(
            'text-white/70 hover:bg-[#87E64B]/12 hover:text-[#87E64B]',
            collapsed && !mobile ? 'w-full justify-center px-2' : 'w-full justify-start'
          )}
          onClick={handleSignOut}
          disabled={signingOut}
          title={collapsed && !mobile ? 'Sign out' : undefined}
        >
          {signingOut ? (
            <Loader2 className={cn('h-5 w-5 animate-spin', (!collapsed || mobile) && 'mr-3')} />
          ) : (
            <LogOut className={cn('h-5 w-5', (!collapsed || mobile) && 'mr-3')} />
          )}
          {(!collapsed || mobile) && 'Sign out'}
        </Button>
      </div>
    </>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={cn(
        'hidden h-full flex-col border-r border-[#2a2a2a] bg-[#181818] text-white transition-all duration-300 md:flex',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div
        className={cn(
          'flex border-b border-[#2a2a2a]',
          collapsed ? 'h-24 flex-col items-center justify-center gap-1 px-2 py-2' : 'h-16 items-center justify-between px-6'
        )}
      >
        {collapsed ? (
          <Image
            src={appIcon}
            alt="CashIn icon"
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg"
            priority
          />
        ) : (
          <div className="overflow-hidden transition-all duration-300 w-32 opacity-100">
            <Image
              src="/cashin.svg"
              alt="CashIn"
              width={128}
              height={32}
              className="h-10 w-auto"
              priority
            />
          </div>
        )}
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((value) => !value)}
          className="rounded-md p-2 text-white/70 transition-colors hover:bg-[#87E64B]/12 hover:text-[#87E64B]"
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>
      <SidebarNav collapsed={collapsed} />
    </div>
  )
}

export function MobileSidebarButton() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-white hover:bg-[#87E64B]/15 hover:text-[#87E64B]"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex h-full w-[280px] flex-col border-r border-[#2a2a2a] bg-[#181818] p-0 text-white sm:max-w-none"
      >
        <div className="flex h-16 items-center border-b border-[#2a2a2a] px-6">
          <Image
            src="/cashin.svg"
            alt="CashIn"
            width={128}
            height={32}
            className="h-10 w-auto"
            priority
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <SidebarNav mobile onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
