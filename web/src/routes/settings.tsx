import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Database,
  HardDrive,
  Palette,
  RotateCcw,
  Save,
  Shield,
} from 'lucide-react'
import {
  HeaderActionButton,
  PageSection,
  PageToolbar,
  SettingRow,
  SettingsCard,
  SettingsTabBar,
} from '@/components/app/docker-view-ui'
import { Input } from '@/components/ui/input'
import { useSaveSettingsMutation, useValidateSettingsMutation } from '@/features/settings/mutations'
import { settingsQueryOptions } from '@/features/settings/query-options'
import { settingsTabs, type SettingsTabId } from '@/lib/mock-data'
import type { SettingsState } from '@/lib/api/client'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('docker')
  const [draftOverride, setDraftOverride] = useState<SettingsState | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const settingsQuery = useQuery(settingsQueryOptions)
  const validateMutation = useValidateSettingsMutation()
  const saveMutation = useSaveSettingsMutation()
  const draft = draftOverride ?? settingsQuery.data ?? null

  async function handleSave() {
    if (!draft) {
      return
    }

    setFeedback(null)
    const validation = await validateMutation.mutateAsync(draft)
    if (!validation.valid) {
      const issue = validation.issues?.[0]
      setFeedback({
        tone: 'error',
        message: issue?.message ?? 'Settings validation failed.',
      })
      return
    }

    try {
      const result = await saveMutation.mutateAsync(draft)
      setDraftOverride(result.settings)
      setFeedback({
        tone: 'success',
        message: result.requiresRestart
          ? `Settings saved. Restart required for: ${(result.restartKeys ?? []).join(', ')}`
          : 'Settings saved.',
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Failed to save settings.',
      })
    }
  }

  function handleReset() {
    if (settingsQuery.data) {
      setDraftOverride(null)
      setFeedback(null)
    }
  }

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Settings"
        description="Configure DockerView preferences and controlled runtime options"
        actions={
          <>
            <HeaderActionButton onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </HeaderActionButton>
            <HeaderActionButton variant="default" onClick={() => void handleSave()}>
              <Save className="h-4 w-4" />
              Save Changes
            </HeaderActionButton>
          </>
        }
      />

      {feedback ? (
        <PageSection className={feedback.tone === 'error' ? 'px-4 py-3 text-sm text-[#b24b4b]' : 'px-4 py-3 text-sm text-[#15795d]'}>
          {feedback.message}
        </PageSection>
      ) : null}

      {settingsQuery.isLoading ? <SettingsStatePanel message="Loading settings..." /> : null}
      {settingsQuery.error ? <SettingsStatePanel message={settingsQuery.error.message} tone="error" /> : null}

      {draft ? (
        <>
          <SettingsTabBar tabs={settingsTabs} activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'docker' ? (
            <DockerSettingsPanel draft={draft} onChange={setDraftOverride} />
          ) : null}
          {activeTab === 'security' ? (
            <SecuritySettingsPanel draft={draft} onChange={setDraftOverride} />
          ) : null}
          {activeTab === 'notifications' ? (
            <NotificationsSettingsPanel draft={draft} onChange={setDraftOverride} />
          ) : null}
          {activeTab === 'appearance' ? (
            <AppearanceSettingsPanel draft={draft} onChange={setDraftOverride} />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function DockerSettingsPanel({
  draft,
  onChange,
}: {
  draft: SettingsState
  onChange: (next: SettingsState) => void
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <SettingsCard
        icon={HardDrive}
        title="Docker Connection"
        description="Configure how DockerView connects to your Docker daemon"
      >
        <div className="space-y-4">
          <InputField
            label="Docker Host"
            description="The Docker daemon socket or TCP endpoint"
            value={draft.docker.host}
            onChange={(value) =>
              onChange({
                ...draft,
                docker: { ...draft.docker, host: value },
              })
            }
          />
          <SettingRow
            title="TLS Connection"
            description="Use TLS for secure Docker daemon connection"
            enabled={draft.docker.tlsEnabled}
            trailing={
              <Toggle
                checked={draft.docker.tlsEnabled}
                onChange={(value) =>
                  onChange({
                    ...draft,
                    docker: { ...draft.docker, tlsEnabled: value },
                  })
                }
              />
            }
          />
          <SettingRow
            title="Auto Refresh"
            description="Automatically refresh dashboard and resource data"
            enabled={draft.docker.autoRefresh}
            trailing={
              <Toggle
                checked={draft.docker.autoRefresh}
                onChange={(value) =>
                  onChange({
                    ...draft,
                    docker: { ...draft.docker, autoRefresh: value },
                  })
                }
              />
            }
          />
          <InputField
            label="Refresh Interval (seconds)"
            description="Used by polling-based monitoring and overview pages"
            value={String(draft.docker.refreshIntervalSeconds)}
            onChange={(value) =>
              onChange({
                ...draft,
                docker: {
                  ...draft.docker,
                  refreshIntervalSeconds: Number.parseInt(value || '0', 10) || 0,
                },
              })
            }
          />
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Database}
        title="Docker Info"
        description="Read-only engine information discovered from the current daemon"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoField label="Docker Version" value={draft.docker.dockerVersion ?? '-'} />
          <InfoField label="API Version" value={draft.docker.apiVersion ?? '-'} />
          <InfoField label="Operating System" value={draft.docker.operatingSystem ?? '-'} />
          <InfoField label="Kernel Version" value={draft.docker.kernelVersion ?? '-'} />
          <InfoField label="Storage Driver" value={draft.docker.storageDriver ?? '-'} />
          <InfoField label="Cgroup Driver" value={draft.docker.cgroupDriver ?? '-'} />
        </div>
      </SettingsCard>
    </div>
  )
}

function SecuritySettingsPanel({
  draft,
  onChange,
}: {
  draft: SettingsState
  onChange: (next: SettingsState) => void
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <SettingsCard
        icon={Shield}
        title="Authentication"
        description="Manage access control and authentication settings"
      >
        <SettingRow
          title="Require Authentication"
          description="Require login to access DockerView"
          enabled={draft.security.requireAuthentication}
          trailing={
            <Toggle
              checked={draft.security.requireAuthentication}
              onChange={(value) =>
                onChange({
                  ...draft,
                  security: { ...draft.security, requireAuthentication: value },
                })
              }
            />
          }
        />
        <SettingRow
          title="Two-Factor Authentication"
          description="Reserve an additional authentication factor"
          enabled={draft.security.twoFactorEnabled}
          trailing={
            <Toggle
              checked={draft.security.twoFactorEnabled}
              onChange={(value) =>
                onChange({
                  ...draft,
                  security: { ...draft.security, twoFactorEnabled: value },
                })
              }
            />
          }
        />
        <InputField
          label="Session Timeout (minutes)"
          description="Automatically log out after inactivity"
          value={String(draft.security.sessionTimeoutMinutes)}
          onChange={(value) =>
            onChange({
              ...draft,
              security: {
                ...draft.security,
                sessionTimeoutMinutes: Number.parseInt(value || '0', 10) || 0,
              },
            })
          }
        />
      </SettingsCard>

      <SettingsCard
        icon={Shield}
        title="Access Control"
        description="Restrict how clients may reach the server"
      >
        <SettingRow
          title="Allow Local Connections Only"
          description="Limit access to localhost or trusted reverse proxies"
          enabled={draft.security.localConnectionsOnly}
          trailing={
            <Toggle
              checked={draft.security.localConnectionsOnly}
              onChange={(value) =>
                onChange({
                  ...draft,
                  security: { ...draft.security, localConnectionsOnly: value },
                })
              }
            />
          }
        />
      </SettingsCard>
    </div>
  )
}

function NotificationsSettingsPanel({
  draft,
  onChange,
}: {
  draft: SettingsState
  onChange: (next: SettingsState) => void
}) {
  return (
    <SettingsCard
      icon={Bell}
      title="Notification Preferences"
      description="Control which operational events should surface in the UI"
    >
      <SettingsToggleGroup
        draft={draft}
        onChange={onChange}
        items={[
          ['enabled', 'Enable Notifications', 'Receive notifications for important events'],
          ['containerStateChanges', 'Container State Changes', 'Notify when containers start, stop, or crash'],
          ['resourceAlerts', 'Resource Alerts', 'Notify when CPU or memory usage is high'],
          ['imageUpdates', 'Image Updates', 'Notify when new image versions are available'],
          ['securityVulnerabilities', 'Security Vulnerabilities', 'Notify when image scans detect critical issues'],
        ]}
      />
    </SettingsCard>
  )
}

function AppearanceSettingsPanel({
  draft,
  onChange,
}: {
  draft: SettingsState
  onChange: (next: SettingsState) => void
}) {
  return (
    <SettingsCard
      icon={Palette}
      title="Appearance"
      description="Customize the DockerView experience"
    >
      <div className="space-y-4">
        <div>
          <div className="text-[15px] font-semibold text-[#111111]">Color Theme</div>
          <p className="mt-1 text-sm text-[#7f7f7f]">Choose your preferred color scheme</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <button
                key={theme}
                className={`rounded-xl border px-4 py-2 text-sm ${draft.appearance.theme === theme ? 'border-[rgba(17,17,17,0.12)] bg-white text-[#111111]' : 'border-transparent bg-[#f6f6f6] text-[#333333]'}`}
                type="button"
                onClick={() =>
                  onChange({
                    ...draft,
                    appearance: { ...draft.appearance, theme },
                  })
                }
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        <SettingRow
          title="Compact Mode"
          description="Use a more condensed layout"
          enabled={draft.appearance.compactMode}
          trailing={
            <Toggle
              checked={draft.appearance.compactMode}
              onChange={(value) =>
                onChange({
                  ...draft,
                  appearance: { ...draft.appearance, compactMode: value },
                })
              }
            />
          }
        />
        <SettingRow
          title="Show Container IDs"
          description="Display full container IDs in tables"
          enabled={draft.appearance.showContainerIDs}
          trailing={
            <Toggle
              checked={draft.appearance.showContainerIDs}
              onChange={(value) =>
                onChange({
                  ...draft,
                  appearance: { ...draft.appearance, showContainerIDs: value },
                })
              }
            />
          }
        />
      </div>
    </SettingsCard>
  )
}

function SettingsToggleGroup({
  draft,
  onChange,
  items,
}: {
  draft: SettingsState
  onChange: (next: SettingsState) => void
  items: Array<[keyof SettingsState['notifications'], string, string]>
}) {
  return (
    <>
      {items.map(([key, title, description]) => (
        <SettingRow
          key={key}
          title={title}
          description={description}
          enabled={draft.notifications[key]}
          trailing={
            <Toggle
              checked={draft.notifications[key]}
              onChange={(value) =>
                onChange({
                  ...draft,
                  notifications: { ...draft.notifications, [key]: value },
                })
              }
            />
          }
        />
      ))}
    </>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-[#303030]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{checked ? 'Enabled' : 'Disabled'}</span>
    </label>
  )
}

function InputField({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <div className="text-[15px] font-semibold text-[#111111]">{label}</div>
      <p className="mt-1 text-sm text-[#7f7f7f]">{description}</p>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-10 rounded-xl border-[rgba(17,17,17,0.08)] bg-white px-4 text-sm shadow-[0_1px_2px_rgba(17,17,17,0.04)]"
      />
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-[#8b8b8b]">{label}</div>
      <div className="mt-1 text-[15px] font-semibold text-[#111111]">{value}</div>
    </div>
  )
}

function SettingsStatePanel({
  message,
  tone = 'default',
}: {
  message: string
  tone?: 'default' | 'error'
}) {
  return (
    <PageSection className={`px-4 py-3 text-sm ${tone === 'error' ? 'text-[#b24b4b]' : 'text-[#8b8b8b]'}`}>
      {message}
    </PageSection>
  )
}
