import {
  Activity,
  Container,
  Gauge,
  HardDrive,
  Image as ImageIcon,
  LayoutDashboard,
  Network,
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
      { to: '/networks', label: 'Networks', icon: Network },
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
  workspaceIcon: Gauge,
} as const
