import { useLocation } from 'react-router-dom'
import { Menu, Bell, Flame } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Welcome back', subtitle: 'Ready to practice?' },
  '/conversation': { title: 'Talk to Eva', subtitle: 'Voice-first AI conversation' },
  '/interview': { title: 'Interview Mode', subtitle: 'Practice with realistic interview scenarios' },
  '/practice': { title: 'Daily Practice', subtitle: 'Build skills through focused exercises' },
  '/dashboard': { title: 'Your Progress', subtitle: 'Track your improvement journey' },
  '/history': { title: 'Session History', subtitle: 'Review your past conversations' },
}

export function TopBar() {
  const { setSidebarOpen } = useUIStore()
  const { user } = useAuthStore()
  const location = useLocation()
  const pageInfo = pageTitles[location.pathname] || { title: 'Eva', subtitle: '' }
  const streak = user?.stats?.currentStreak ?? 0

  return (
    <header className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-eva-border/30 bg-eva-bg/80 backdrop-blur-sm">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-eva-text-dim hover:text-eva-text transition-colors"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-eva-text leading-tight">
            {location.pathname === '/' && user
              ? `Welcome back, ${user.name.split(' ')[0]}`
              : pageInfo.title}
          </h1>
          <p className="text-xs text-eva-text-muted">{pageInfo.subtitle}</p>
        </div>
      </div>

      {/* Right: streak + notifications */}
      <div className="flex items-center gap-2">
        {streak > 0 && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
              'bg-eva-amber/10 border border-eva-amber/20 text-eva-amber'
            )}
          >
            <Flame size={13} />
            <span>{streak} day streak</span>
          </div>
        )}
        <button className="p-2 rounded-lg hover:bg-white/5 text-eva-text-muted hover:text-eva-text transition-colors relative">
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}
