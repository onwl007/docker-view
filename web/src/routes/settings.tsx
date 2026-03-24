import { useState } from 'react'
import {
  Bell,
  Database,
  HardDrive,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
} from 'lucide-react'
import {
  FauxSelect,
  HeaderActionButton,
  PageToolbar,
  SettingRow,
  SettingsCard,
  SettingsTabBar,
  ThemeChoice,
} from '@/components/app/docker-view-ui'
import { settingsTabs, type SettingsTabId } from '@/lib/mock-data'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('docker')

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Settings"
        description="Configure your DockerView preferences"
        actions={
          <>
            <HeaderActionButton>
              <RotateCcw className="h-4 w-4" />
              Reset
            </HeaderActionButton>
            <HeaderActionButton variant="default">
              <Save className="h-4 w-4" />
              Save Changes
            </HeaderActionButton>
          </>
        }
      />

      <SettingsTabBar tabs={settingsTabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'docker' ? <DockerSettingsPanel /> : null}
      {activeTab === 'security' ? <SecuritySettingsPanel /> : null}
      {activeTab === 'notifications' ? <NotificationsSettingsPanel /> : null}
      {activeTab === 'appearance' ? <AppearanceSettingsPanel /> : null}
    </div>
  )
}

function DockerSettingsPanel() {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <SettingsCard
        icon={HardDrive}
        title="Docker Connection"
        description="Configure how DockerView connects to your Docker daemon"
      >
        <div className="space-y-4">
          <div>
            <div className="text-[15px] font-semibold text-[#111111]">Docker Host</div>
            <p className="mt-1 text-sm text-[#7f7f7f]">The Docker daemon socket or TCP endpoint</p>
            <input
              value="unix:///var/run/docker.sock"
              readOnly
              className="mt-3 h-10 w-full rounded-xl border border-[rgba(17,17,17,0.08)] bg-white px-4 text-sm shadow-[0_1px_2px_rgba(17,17,17,0.04)]"
            />
          </div>
          <div className="border-t border-[rgba(17,17,17,0.06)] pt-4">
            <div className="text-[15px] font-semibold text-[#111111]">API Port</div>
            <p className="mt-1 text-sm text-[#7f7f7f]">Port for Docker API (only used with TCP connections)</p>
            <input
              value="2375"
              readOnly
              className="mt-3 h-10 w-full rounded-xl border border-[rgba(17,17,17,0.08)] bg-white px-4 text-sm shadow-[0_1px_2px_rgba(17,17,17,0.04)]"
            />
          </div>
          <SettingRow
            title="TLS Connection"
            description="Use TLS for secure Docker daemon connection"
            enabled={false}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        icon={RefreshCw}
        title="Data & Refresh"
        description="Configure data refresh and caching settings"
      >
        <div className="space-y-4">
          <SettingRow
            title="Auto Refresh"
            description="Automatically refresh container and resource data"
            enabled
          />
          <div className="border-t border-[rgba(17,17,17,0.06)] pt-4">
            <div className="text-[15px] font-semibold text-[#111111]">Refresh Interval (seconds)</div>
            <div className="mt-3">
              <FauxSelect value="5 seconds" />
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Database}
        title="Docker Info"
        description="Information about your Docker installation"
        className="xl:col-span-2"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <InfoField label="Docker Version" value="24.0.7" />
          <InfoField label="API Version" value="1.43" />
          <InfoField label="Operating System" value="Ubuntu 22.04.3 LTS" />
          <InfoField label="Kernel Version" value="5.15.0-91-generic" />
          <InfoField label="Storage Driver" value="overlay2" />
          <InfoField label="Group Driver" value="systemd" />
        </div>
      </SettingsCard>
    </div>
  )
}

function SecuritySettingsPanel() {
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
          enabled
        />
        <SettingRow
          title="Two-Factor Authentication"
          description="Add an extra layer of security with 2FA"
          enabled={false}
        />
        <div className="border-t border-[rgba(17,17,17,0.06)] pt-4">
          <div className="text-[15px] font-semibold text-[#111111]">Session Timeout (minutes)</div>
          <p className="mt-1 text-sm text-[#7f7f7f]">Automatically log out after inactivity</p>
          <input
            value="30"
            readOnly
            className="mt-3 h-10 w-full rounded-xl border border-[rgba(17,17,17,0.08)] bg-white px-4 text-sm shadow-[0_1px_2px_rgba(17,17,17,0.04)]"
          />
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Shield}
        title="Access Control"
        description="Configure network access restrictions"
      >
        <SettingRow
          title="Allow Local Connections Only"
          description="Restrict access to localhost and trusted reverse proxies"
          enabled
        />
      </SettingsCard>
    </div>
  )
}

function NotificationsSettingsPanel() {
  return (
    <SettingsCard
      icon={Bell}
      title="Notification Preferences"
      description="Configure when and how you receive notifications"
    >
      <SettingRow
        title="Enable Notifications"
        description="Receive notifications for important events"
        enabled
      />
      <SettingRow
        title="Container State Changes"
        description="Notify when containers start, stop, or crash"
        enabled
      />
      <SettingRow
        title="Resource Alerts"
        description="Notify when CPU or memory usage is high"
        enabled
      />
      <SettingRow
        title="Image Updates"
        description="Notify when new image versions are available"
        enabled={false}
      />
      <SettingRow
        title="Security Vulnerabilities"
        description="Notify when image scans detect critical issues"
        enabled={false}
      />
    </SettingsCard>
  )
}

function AppearanceSettingsPanel() {
  return (
    <SettingsCard
      icon={Palette}
      title="Theme"
      description="Customize the appearance of DockerView"
    >
      <div>
        <div className="text-[15px] font-semibold text-[#111111]">Color Theme</div>
        <p className="mt-1 text-sm text-[#7f7f7f]">Choose your preferred color scheme</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ThemeChoice label="Light" preview="light" />
          <ThemeChoice label="Dark" preview="dark" active />
          <ThemeChoice label="System" preview="system" />
        </div>
      </div>
      <div className="mt-6">
        <SettingRow
          title="Compact Mode"
          description="Use a more condensed layout"
          enabled={false}
        />
        <SettingRow
          title="Show Container IDs"
          description="Display full container IDs in tables"
          enabled={false}
        />
      </div>
    </SettingsCard>
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
