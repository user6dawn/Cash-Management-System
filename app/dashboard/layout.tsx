import { Sidebar } from '@/components/dashboard/sidebar'
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
        <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-950">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
