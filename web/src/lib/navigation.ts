import {
  Activity,
  Box,
  Container,
  Gauge,
  HardDrive,
  Image as ImageIcon,
  LayoutDashboard,
  Settings,
} from 'lucide-react'

export const navigationSections = [
  {
    label: 'Management',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/containers', label: 'Containers', icon: Container },
      { to: '/images', label: 'Images', icon: ImageIcon },
      { to: '/volumes', label: 'Volumes', icon: HardDrive },
      { to: '/networks', label: 'Networks', icon: Box },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/monitoring', label: 'Monitoring', icon: Activity },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
] as const

export const shellMeta = {
  productName: 'DockerView',
  tagline: 'Container management workspace',
  statusLabel: 'Docker Engine',
  workspaceLabel: 'Single-node operator shell',
  workspaceHint:
    'Phase 1 establishes the shared application shell, summary API, and dashboard control surface.',
  workspaceIcon: Gauge,
} as const
