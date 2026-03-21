import { MobileSidebarButton, Sidebar } from '@/components/dashboard/sidebar'
import { AuthProvider } from '@/contexts/auth-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
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
    </AuthProvider>
  )
}
