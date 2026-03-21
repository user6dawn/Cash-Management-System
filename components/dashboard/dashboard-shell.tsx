'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { MobileSidebarButton, Sidebar } from '@/components/dashboard/sidebar'
import { useAuth } from '@/contexts/auth-context'

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, router, user])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[#87E64B]/30 bg-white px-5 py-4 shadow-sm shadow-[#87E64B]/10">
          <Loader2 className="h-5 w-5 animate-spin text-[#181818]" />
          <p className="text-sm font-medium text-[#181818]">Checking your session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-[#87E64B]/30 bg-[#181818] px-4 md:hidden">
          <div className="flex items-center gap-3">
            <MobileSidebarButton />
            <img src="/cashin.svg" alt="CashIn" className="h-10 w-auto" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
