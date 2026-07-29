import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  MessageCircle,
  Briefcase,
  BookOpen,
  BarChart3,
  Clock,
  Settings,
  LogOut,
  X,
  Sparkles,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const navItems = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'conversation', label: 'Talk to Eva', icon: MessageCircle, path: '/conversation' },
  { id: 'interview', label: 'Interview', icon: Briefcase, path: '/interview' },
  { id: 'practice', label: 'Daily Practice', icon: BookOpen, path: '/practice' },
  { id: 'dashboard', label: 'Progress', icon: BarChart3, path: '/dashboard' },
  { id: 'history', label: 'History', icon: Clock, path: '/history' },
]

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, setSettingsOpen } = useUIStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleNav = (path: string) => {
    navigate(path)
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-full bg-eva-surface border-r border-eva-border/50 z-30">
        <SidebarContent
          user={user}
          currentPath={location.pathname}
          onNav={handleNav}
          onSettings={() => setSettingsOpen(true)}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-64 bg-eva-surface border-r border-eva-border/50 z-30 lg:hidden"
          >
            <SidebarContent
              user={user}
              currentPath={location.pathname}
              onNav={handleNav}
              onSettings={() => setSettingsOpen(true)}
              onLogout={handleLogout}
              showClose
              onClose={() => setSidebarOpen(false)}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

interface SidebarContentProps {
  user: { name: string; avatar?: string; email: string } | null
  currentPath: string
  onNav: (path: string) => void
  onSettings: () => void
  onLogout: () => void
  showClose?: boolean
  onClose?: () => void
}

function SidebarContent({
  user,
  currentPath,
  onNav,
  onSettings,
  onLogout,
  showClose,
  onClose,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-6">
        <button
          onClick={() => onNav('/')}
          className="flex items-center gap-3 group"
        >
          <div className="relative w-9 h-9 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-eva-accent/20 group-hover:bg-eva-accent/30 transition-colors" />
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-eva-accent to-eva-purple opacity-90" />
            <Sparkles size={16} className="relative z-10 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-gradient">Eva</span>
            <p className="text-[10px] text-eva-text-muted leading-none mt-0.5">AI Mentor</p>
          </div>
        </button>
        {showClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-eva-text-muted hover:text-eva-text transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.path)}
              className={cn(
                'nav-item w-full text-left text-sm',
                isActive && 'nav-item-active'
              )}
            >
              <Icon size={18} className={isActive ? 'text-eva-accent' : ''} />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-eva-accent" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1 border-t border-eva-border/50 pt-3">
        <button
          onClick={onSettings}
          className="nav-item w-full text-left text-sm"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

        {/* User profile */}
        {user && (
          <div className="flex items-center gap-3 px-4 py-3 mt-1">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-eva-accent/20 flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-eva-accent font-semibold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-eva-text truncate">{user.name}</p>
              <p className="text-xs text-eva-text-muted truncate">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg hover:bg-eva-red/10 text-eva-text-muted hover:text-eva-red transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
