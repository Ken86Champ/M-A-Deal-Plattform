import { Header } from '@/components/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Header />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
