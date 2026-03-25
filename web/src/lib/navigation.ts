import {
  Activity,
  Container,
  Layers3,
  HardDrive,
  Image as ImageIcon,
  LayoutDashboard,
  Network,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { BrandMark } from '@/components/app/brand-mark'

export const navigationSections = [
  {
    label: 'Management',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/containers', label: 'Containers', icon: Container },
      { to: '/images', label: 'Images', icon: ImageIcon },
      { to: '/volumes', label: 'Volumes', icon: HardDrive },
      { to: '/networks', label: 'Networks', icon: Network },
      { to: '/compose', label: 'Compose', icon: Layers3 },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/monitoring', label: 'Monitoring', icon: Activity },
      { to: '/audit', label: 'Audit', icon: ShieldCheck },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
] as const

export const shellMeta = {
  productName: 'DockerView',
  tagline: 'Container management workspace',
  workspaceIcon: BrandMark,
} as const
