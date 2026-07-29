import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import type { ToastType } from '@/types'

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-eva-green" />,
  error: <XCircle size={16} className="text-eva-red" />,
  info: <Info size={16} className="text-eva-cyan" />,
  warning: <AlertTriangle size={16} className="text-eva-amber" />,
}

const borders: Record<ToastType, string> = {
  success: 'border-eva-green/30',
  error: 'border-eva-red/30',
  info: 'border-eva-cyan/30',
  warning: 'border-eva-amber/30',
}

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl',
              'bg-eva-panel/95 backdrop-blur-xl border shadow-xl min-w-[280px] max-w-[380px]',
              borders[toast.type]
            )}
          >
            <div className="mt-0.5 flex-shrink-0">{icons[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-eva-text">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-eva-text-dim mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 text-eva-text-muted hover:text-eva-text transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
