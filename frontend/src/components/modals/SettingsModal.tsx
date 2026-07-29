import { useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2, Mic, Palette, User, Bell, ChevronRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { VoiceOption, EnglishLevel } from '@/types'

const voiceOptions: { value: VoiceOption; label: string; description: string }[] = [
  { value: 'nova', label: 'Nova', description: 'Warm and friendly' },
  { value: 'alloy', label: 'Alloy', description: 'Neutral and clear' },
  { value: 'shimmer', label: 'Shimmer', description: 'Soft and gentle' },
  { value: 'fable', label: 'Fable', description: 'Expressive and dynamic' },
  { value: 'onyx', label: 'Onyx', description: 'Deep and authoritative' },
  { value: 'echo', label: 'Echo', description: 'Confident and professional' },
]

const levelOptions: { value: EnglishLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner (A1)' },
  { value: 'elementary', label: 'Elementary (A2)' },
  { value: 'intermediate', label: 'Intermediate (B1)' },
  { value: 'upper-intermediate', label: 'Upper Intermediate (B2)' },
  { value: 'advanced', label: 'Advanced (C1)' },
  { value: 'proficient', label: 'Proficient (C2)' },
]

type Tab = 'profile' | 'voice' | 'display' | 'notifications'

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
  { id: 'voice', label: 'Voice', icon: <Mic size={16} /> },
  { id: 'display', label: 'Display', icon: <Palette size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
]

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen, setSoundEnabled, soundEnabled, setParticlesEnabled, particlesEnabled } = useUIStore()
  const { user, updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('voice')
  const [saving, setSaving] = useState(false)

  const settings = user?.settings

  const updateSetting = async (key: string, value: unknown) => {
    if (!user) return
    setSaving(true)
    try {
      await authApi.updateSettings({ [key]: value })
      updateUser({ settings: { ...user.settings, [key]: value } })
    } catch {
      // silently fail in demo
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      title="Settings"
      size="lg"
    >
      <div className="flex min-h-[400px]">
        {/* Sidebar */}
        <div className="w-44 border-r border-eva-border/50 p-3 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all mb-0.5',
                activeTab === tab.id
                  ? 'bg-eva-accent/10 text-eva-accent border border-eva-accent/20'
                  : 'text-eva-text-dim hover:text-eva-text hover:bg-white/5'
              )}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && <ChevronRight size={12} className="ml-auto" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <h3 className="text-sm font-semibold text-eva-text mb-4">Profile & Learning</h3>
              <div>
                <label className="text-xs text-eva-text-muted block mb-2">English Level</label>
                <select
                  value={settings?.targetLevel || 'intermediate'}
                  onChange={(e) => updateSetting('targetLevel', e.target.value)}
                  className="w-full bg-eva-surface border border-eva-border rounded-lg px-3 py-2 text-sm text-eva-text focus:outline-none focus:border-eva-accent/50"
                >
                  {levelOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-eva-text-muted block mb-2">Native Language</label>
                <input
                  type="text"
                  value={settings?.nativeLanguage || ''}
                  onChange={(e) => updateSetting('nativeLanguage', e.target.value)}
                  placeholder="e.g. Hindi, Spanish, Mandarin..."
                  className="w-full bg-eva-surface border border-eva-border rounded-lg px-3 py-2 text-sm text-eva-text focus:outline-none focus:border-eva-accent/50 placeholder:text-eva-text-muted"
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'voice' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <h3 className="text-sm font-semibold text-eva-text mb-4">Voice & Audio</h3>
              <div>
                <label className="text-xs text-eva-text-muted block mb-3">Eva's Voice</label>
                <div className="grid grid-cols-2 gap-2">
                  {voiceOptions.map((v) => (
                    <button
                      key={v.value}
                      onClick={() => updateSetting('preferredVoice', v.value)}
                      className={cn(
                        'p-3 rounded-xl border text-left transition-all',
                        settings?.preferredVoice === v.value
                          ? 'border-eva-accent/50 bg-eva-accent/10'
                          : 'border-eva-border/50 hover:border-eva-border'
                      )}
                    >
                      <p className={cn('text-sm font-medium', settings?.preferredVoice === v.value ? 'text-eva-accent' : 'text-eva-text')}>
                        {v.label}
                      </p>
                      <p className="text-xs text-eva-text-muted mt-0.5">{v.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <ToggleSetting
                label="Sound Effects"
                description="UI sounds and feedback tones"
                icon={<Volume2 size={16} />}
                value={soundEnabled}
                onChange={setSoundEnabled}
              />
              <ToggleSetting
                label="Auto-Listen"
                description="Automatically resume listening after Eva speaks"
                icon={<Mic size={16} />}
                value={settings?.autoListen ?? true}
                onChange={(v) => updateSetting('autoListen', v)}
              />
            </motion.div>
          )}

          {activeTab === 'display' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <h3 className="text-sm font-semibold text-eva-text mb-4">Display & Effects</h3>
              <ToggleSetting
                label="Particle Effects"
                description="Animated particles in the 3D core"
                icon={<Palette size={16} />}
                value={particlesEnabled}
                onChange={setParticlesEnabled}
              />
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <h3 className="text-sm font-semibold text-eva-text mb-4">Notifications</h3>
              <ToggleSetting
                label="Push Notifications"
                description="Daily practice reminders and streak alerts"
                icon={<Bell size={16} />}
                value={settings?.notifications ?? false}
                onChange={(v) => updateSetting('notifications', v)}
              />
            </motion.div>
          )}

          {saving && (
            <p className="text-xs text-eva-text-muted mt-4">Saving...</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ToggleSetting({
  label,
  description,
  icon,
  value,
  onChange,
}: {
  label: string
  description: string
  icon: React.ReactNode
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-eva-border/30">
      <div className="flex items-center gap-3">
        <div className="text-eva-text-muted">{icon}</div>
        <div>
          <p className="text-sm text-eva-text">{label}</p>
          <p className="text-xs text-eva-text-muted">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors duration-200',
          value ? 'bg-eva-accent' : 'bg-eva-border'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200',
            value && 'translate-x-5'
          )}
        />
      </button>
    </div>
  )
}
