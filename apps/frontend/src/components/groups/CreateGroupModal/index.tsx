'use client'

import { useState } from 'react'
import { Drawer } from 'vaul'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { useCreateGroup } from '@/hooks/useGroups'
import { StepCoverAndName } from './StepCoverAndName'
import { StepLocation } from './StepLocation'
import { StepInviteFriends } from './StepInviteFriends'

interface FormState {
  name: string
  coverKey: string | null
  coverPreview: string | null
  location: { lat: number; lng: number; address: string } | null
  memberIds: string[]
}

const INITIAL_STATE: FormState = {
  name: '',
  coverKey: null,
  coverPreview: null,
  location: null,
  memberIds: [],
}

const STEPS = ['Обложка и название', 'Местоположение', 'Пригласить друзей']

export function CreateGroupModal() {
  const { isCreateGroupOpen, closeCreateGroup } = useUIStore()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)

  const { mutateAsync: createGroup, isPending } = useCreateGroup()

  function handleClose() {
    closeCreateGroup()
    // Reset with delay to avoid flicker
    setTimeout(() => {
      setStep(0)
      setForm(INITIAL_STATE)
    }, 300)
  }

  async function handleSubmit() {
    try {
      await createGroup({
        name: form.name,
        coverKey: form.coverKey ?? undefined,
        lat: form.location!.lat,
        lng: form.location!.lng,
        address: form.location!.address,
        memberIds: form.memberIds,
      })
      handleClose()
    } catch (err) {
      console.error('Create group error:', err)
    }
  }

  function toggleMember(userId: string) {
    setForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter((id) => id !== userId)
        : [...prev.memberIds, userId],
    }))
  }

  return (
    <Drawer.Root open={isCreateGroupOpen} onOpenChange={(open) => !open && handleClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl bg-white max-h-[90dvh]">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div>
              <h2 className="text-lg font-bold">Новая поездка</h2>
              <div className="flex items-center gap-1.5 mt-1">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step
                        ? 'w-6 bg-primary'
                        : i < step
                        ? 'w-4 bg-primary/40'
                        : 'w-4 bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step label */}
          <div className="px-5 pt-3 pb-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Шаг {step + 1} из {STEPS.length} — {STEPS[step]}
            </p>
          </div>

          {/* Content with animated step transitions */}
          <div className="flex-1 overflow-y-auto px-5 pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                {step === 0 && (
                  <StepCoverAndName
                    name={form.name}
                    coverKey={form.coverKey}
                    coverPreview={form.coverPreview}
                    onNameChange={(name) => setForm((p) => ({ ...p, name }))}
                    onCoverChange={(key, preview) =>
                      setForm((p) => ({ ...p, coverKey: key, coverPreview: preview }))
                    }
                    onCoverClear={() =>
                      setForm((p) => ({ ...p, coverKey: null, coverPreview: null }))
                    }
                    onNext={() => setStep(1)}
                  />
                )}

                {step === 1 && (
                  <StepLocation
                    location={form.location}
                    onLocationChange={(loc) => setForm((p) => ({ ...p, location: loc }))}
                    onNext={() => setStep(2)}
                    onBack={() => setStep(0)}
                  />
                )}

                {step === 2 && (
                  <StepInviteFriends
                    selectedIds={form.memberIds}
                    onToggle={toggleMember}
                    onSubmit={handleSubmit}
                    onBack={() => setStep(1)}
                    isLoading={isPending}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
