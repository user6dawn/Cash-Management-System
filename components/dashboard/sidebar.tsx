'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)

    try {
      const { error } = await signOut()

      if (!error) {
        window.location.href = '/login'
      }
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r border-[#2a2a2a] bg-[#181818] text-white transition-all duration-300',
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

      <nav className={cn('flex-1 space-y-1 py-4', collapsed ? 'px-2' : 'px-3')}>
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
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
            collapsed ? 'w-full justify-center px-2' : 'w-full justify-start'
          )}
          onClick={handleSignOut}
          disabled={signingOut}
          title={collapsed ? 'Sign out' : undefined}
        >
          {signingOut ? (
            <Loader2 className={cn('h-5 w-5 animate-spin', !collapsed && 'mr-3')} />
          ) : (
            <LogOut className={cn('h-5 w-5', !collapsed && 'mr-3')} />
          )}
          {!collapsed && 'Sign out'}
        </Button>
      </div>
    </div>
  )
}
