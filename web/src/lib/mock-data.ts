import {
  Bell,
  Box,
  BrushCleaning,
  Container,
  Cpu,
  HardDrive,
  Image as ImageIcon,
  Network,
  Palette,
  Shield,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface OverviewMetric {
  label: string
  value: string
  accent?: 'default' | 'green' | 'blue' | 'amber' | 'purple'
  detail?: string
  subvalue?: string
  progress?: number
  leadingIcon?: LucideIcon
  breakdown?: Array<{
    label: string
    value: string
    tone?: 'default' | 'green' | 'blue' | 'amber'
  }>
}

export interface TableAction {
  label: string
  tone?: 'default' | 'danger'
}

export interface ContainerRow {
  id: string
  name: string
  shortId: string
  image: string
  status: 'running' | 'stopped' | 'paused'
  ports: string[]
  cpu: string
  memory: string
  uptime: string
  primaryAction: 'stop' | 'start'
}

export interface ImageRow {
  id: string
  repository: string
  tag: string
  imageId: string
  size: string
  layers: string
  created: string
  containers: string
  inUse: boolean
}

export interface VolumeRow {
  id: string
  name: string
  driver: string
  size: string
  mountpoint: string
  created: string
  container: string
  attached: boolean
}

export interface NetworkRow {
  id: string
  name: string
  shortId: string
  driver: string
  scope: string
  subnet: string
  gateway: string
  access: 'external' | 'internal'
  containers: string[]
}

export interface MonitoringRow {
  id: string
  name: string
  shortId: string
  cpu: number
  memoryUsed: string
  memoryTotal: string
  memoryProgress: number
  networkRx: string
  networkTx: string
  diskRead: string
  diskWrite: string
  pids: number
}

export const dashboardPrimaryMetrics: OverviewMetric[] = [
  {
    label: 'Containers',
    value: '12',
    accent: 'default',
    detail: '8 running, 4 stopped',
    subvalue: '+2',
    leadingIcon: Container,
  },
  {
    label: 'Images',
    value: '24',
    accent: 'default',
    detail: '3.2 GB total',
    subvalue: '+5',
    leadingIcon: ImageIcon,
  },
  {
    label: 'Volumes',
    value: '8',
    accent: 'default',
    detail: '12.4 GB used',
    leadingIcon: HardDrive,
  },
  {
    label: 'Networks',
    value: '5',
    accent: 'default',
    detail: '3 custom, 2 default',
    subvalue: '+1',
    leadingIcon: Network,
  },
]

export const dashboardHostMetrics: OverviewMetric[] = [
  {
    label: 'CPU Usage',
    value: '34%',
    detail: '8 cores',
    progress: 34,
    accent: 'blue',
    leadingIcon: Cpu,
  },
  {
    label: 'Memory',
    value: '12.4 GB',
    subvalue: '/ 32 GB',
    progress: 39,
    accent: 'green',
    leadingIcon: Box,
  },
  {
    label: 'Disk',
    value: '156 GB',
    subvalue: '/ 500 GB',
    progress: 31,
    accent: 'amber',
    leadingIcon: HardDrive,
  },
  {
    label: 'Network I/O',
    value: '',
    accent: 'purple',
    leadingIcon: Network,
    breakdown: [
      { label: 'Received', value: '1.2 GB', tone: 'green' },
      { label: 'Transmitted', value: '856 MB', tone: 'blue' },
    ],
  },
]

export const dashboardRecentContainers = [
  {
    name: 'nginx-proxy',
    shortId: 'a1b2c3d4',
    image: 'nginx:latest',
    status: 'running' as const,
    cpu: '2.4%',
    memory: '128 MB',
    uptime: '2d 14h',
  },
  {
    name: 'postgres-db',
    shortId: 'e5f6g7h8',
    image: 'postgres:15',
    status: 'running' as const,
    cpu: '8.2%',
    memory: '512 MB',
    uptime: '5d 3h',
  },
  {
    name: 'redis-cache',
    shortId: 'i9j0k1l2',
    image: 'redis:7-alpine',
    status: 'running' as const,
    cpu: '0.8%',
    memory: '64 MB',
    uptime: '5d 3h',
  },
  {
    name: 'api-server',
    shortId: 'm3n4o5p6',
    image: 'node:20-alpine',
    status: 'running' as const,
    cpu: '15.3%',
    memory: '256 MB',
    uptime: '1d 8h',
  },
  {
    name: 'worker-1',
    shortId: 'q7r8s9t0',
    image: 'python:3.11',
    status: 'stopped' as const,
    cpu: '0%',
    memory: '0 MB',
    uptime: '-',
  },
]

export const containersOverview: OverviewMetric[] = [
  { label: 'Total Containers', value: '8' },
  { label: 'Running', value: '6', accent: 'green' },
  { label: 'Stopped', value: '1', accent: 'default' },
  { label: 'CPU Usage', value: '35.0%' },
]

export const containerRows: ContainerRow[] = [
  {
    id: 'nginx-proxy',
    name: 'nginx-proxy',
    shortId: 'a1b2c3d4e5f6',
    image: 'nginx:latest',
    status: 'running',
    ports: ['80:80', '443:443'],
    cpu: '2.4%',
    memory: '128 MB',
    uptime: '2d 14h',
    primaryAction: 'stop',
  },
  {
    id: 'postgres-db',
    name: 'postgres-db',
    shortId: 'b2c3d4e5f6g7',
    image: 'postgres:15',
    status: 'running',
    ports: ['5432:5432'],
    cpu: '8.2%',
    memory: '512 MB',
    uptime: '5d 3h',
    primaryAction: 'stop',
  },
  {
    id: 'redis-cache',
    name: 'redis-cache',
    shortId: 'c3d4e5f6g7h8',
    image: 'redis:7-alpine',
    status: 'running',
    ports: ['6379:6379'],
    cpu: '0.8%',
    memory: '64 MB',
    uptime: '5d 3h',
    primaryAction: 'stop',
  },
  {
    id: 'api-server',
    name: 'api-server',
    shortId: 'd4e5f6g7h8i9',
    image: 'node:20-alpine',
    status: 'running',
    ports: ['3000:3000'],
    cpu: '15.3%',
    memory: '256 MB',
    uptime: '1d 8h',
    primaryAction: 'stop',
  },
  {
    id: 'worker-1',
    name: 'worker-1',
    shortId: 'e5f6g7h8i9j0',
    image: 'python:3.11',
    status: 'stopped',
    ports: [],
    cpu: '0%',
    memory: '0 MB',
    uptime: '-',
    primaryAction: 'start',
  },
  {
    id: 'mongodb',
    name: 'mongodb',
    shortId: 'f6g7h8i9j0k1',
    image: 'mongo:6',
    status: 'running',
    ports: ['27017:27017'],
    cpu: '5.1%',
    memory: '384 MB',
    uptime: '7d 2h',
    primaryAction: 'stop',
  },
  {
    id: 'elasticsearch',
    name: 'elasticsearch',
    shortId: 'g7h8i9j0k1l2',
    image: 'elasticsearch:8.11',
    status: 'paused',
    ports: ['9200:9200', '9300:9300'],
    cpu: '0%',
    memory: '1024 MB',
    uptime: '-',
    primaryAction: 'start',
  },
  {
    id: 'grafana',
    name: 'grafana',
    shortId: 'h8i9j0k1l2m3',
    image: 'grafana/grafana:latest',
    status: 'running',
    ports: ['3001:3000'],
    cpu: '3.2%',
    memory: '192 MB',
    uptime: '4d 6h',
    primaryAction: 'stop',
  },
]

export const containerMenuActions: TableAction[] = [
  { label: 'View Logs' },
  { label: 'Terminal' },
  { label: 'Restart' },
  { label: 'Remove', tone: 'danger' },
]

export const imagesOverview: OverviewMetric[] = [
  { label: 'Total Images', value: '10' },
  { label: 'Total Size', value: '3.8 GB' },
  { label: 'In Use', value: '7', accent: 'green' },
  { label: 'Unused', value: '3', accent: 'amber' },
]

export const imageRows: ImageRow[] = [
  {
    id: 'nginx',
    repository: 'nginx',
    tag: 'latest',
    imageId: 'sha256:a1b2c3d4',
    size: '142 MB',
    layers: '7',
    created: '2 days ago',
    containers: '2 running',
    inUse: true,
  },
  {
    id: 'postgres',
    repository: 'postgres',
    tag: '15',
    imageId: 'sha256:b2c3d4e5',
    size: '378 MB',
    layers: '14',
    created: '5 days ago',
    containers: '1 running',
    inUse: true,
  },
  {
    id: 'redis',
    repository: 'redis',
    tag: '7-alpine',
    imageId: 'sha256:c3d4e5f6',
    size: '32 MB',
    layers: '5',
    created: '5 days ago',
    containers: '1 running',
    inUse: true,
  },
  {
    id: 'node',
    repository: 'node',
    tag: '20-alpine',
    imageId: 'sha256:d4e5f6g7',
    size: '178 MB',
    layers: '8',
    created: '1 week ago',
    containers: '1 running',
    inUse: true,
  },
  {
    id: 'python',
    repository: 'python',
    tag: '3.11',
    imageId: 'sha256:e5f6g7h8',
    size: '912 MB',
    layers: '11',
    created: '1 week ago',
    containers: '-',
    inUse: false,
  },
  {
    id: 'mongo',
    repository: 'mongo',
    tag: '6',
    imageId: 'sha256:f6g7h8i9',
    size: '654 MB',
    layers: '12',
    created: '2 weeks ago',
    containers: '1 running',
    inUse: true,
  },
  {
    id: 'elastic',
    repository: 'elasticsearch',
    tag: '8.11',
    imageId: 'sha256:g7h8i9j0',
    size: '1.2 GB',
    layers: '9',
    created: '2 weeks ago',
    containers: '1 running',
    inUse: true,
  },
  {
    id: 'grafana',
    repository: 'grafana/grafana',
    tag: 'latest',
    imageId: 'sha256:h8i9j0k1',
    size: '312 MB',
    layers: '10',
    created: '3 weeks ago',
    containers: '1 running',
    inUse: true,
  },
  {
    id: 'ubuntu',
    repository: 'ubuntu',
    tag: '22.04',
    imageId: 'sha256:i9j0k1l2',
    size: '77 MB',
    layers: '4',
    created: '1 month ago',
    containers: '-',
    inUse: false,
  },
  {
    id: 'alpine',
    repository: 'alpine',
    tag: '3.19',
    imageId: 'sha256:j0k1l2m3',
    size: '7.4 MB',
    layers: '1',
    created: '1 month ago',
    containers: '-',
    inUse: false,
  },
]

export const imageMenuActions: TableAction[] = [
  { label: 'Run Container' },
  { label: 'View Layers' },
  { label: 'Add Tag' },
  { label: 'Remove', tone: 'danger' },
]

export const volumesOverview: OverviewMetric[] = [
  { label: 'Total Volumes', value: '8' },
  { label: 'Total Size', value: '19.1 GB' },
  { label: 'In Use', value: '6', accent: 'green' },
  { label: 'Unused', value: '2', accent: 'amber' },
]

export const volumeRows: VolumeRow[] = [
  {
    id: 'postgres-data',
    name: 'postgres_data',
    driver: 'local',
    size: '2.4 GB',
    mountpoint: '/var/lib/docker/volumes/postgres_data',
    created: '2024-01-10',
    container: 'postgres-db',
    attached: true,
  },
  {
    id: 'redis-data',
    name: 'redis_data',
    driver: 'local',
    size: '128 MB',
    mountpoint: '/var/lib/docker/volumes/redis_data',
    created: '2024-01-10',
    container: 'redis-cache',
    attached: true,
  },
  {
    id: 'mongo-data',
    name: 'mongo_data',
    driver: 'local',
    size: '1.8 GB',
    mountpoint: '/var/lib/docker/volumes/mongo_data',
    created: '2024-01-08',
    container: 'mongodb',
    attached: true,
  },
  {
    id: 'nginx-config',
    name: 'nginx_config',
    driver: 'local',
    size: '4 MB',
    mountpoint: '/var/lib/docker/volumes/nginx_config',
    created: '2024-01-15',
    container: 'nginx-proxy',
    attached: true,
  },
  {
    id: 'elastic-data',
    name: 'elasticsearch_data',
    driver: 'local',
    size: '5.2 GB',
    mountpoint: '/var/lib/docker/volumes/elasticsearch_data',
    created: '2024-01-05',
    container: 'elasticsearch',
    attached: true,
  },
  {
    id: 'grafana-data',
    name: 'grafana_data',
    driver: 'local',
    size: '256 MB',
    mountpoint: '/var/lib/docker/volumes/grafana_data',
    created: '2024-01-11',
    container: 'grafana',
    attached: true,
  },
  {
    id: 'backup-volume',
    name: 'backup_volume',
    driver: 'local',
    size: '8.1 GB',
    mountpoint: '/var/lib/docker/volumes/backup_volume',
    created: '2024-01-01',
    container: '-',
    attached: false,
  },
  {
    id: 'logs-volume',
    name: 'logs_volume',
    driver: 'local',
    size: '1.2 GB',
    mountpoint: '/var/lib/docker/volumes/logs_volume',
    created: '2024-01-03',
    container: '-',
    attached: false,
  },
]

export const volumeMenuActions: TableAction[] = [
  { label: 'Browse Files' },
  { label: 'Attach to Container' },
  { label: 'Remove', tone: 'danger' },
]

export const networksOverview: OverviewMetric[] = [
  { label: 'Total Networks', value: '5' },
  { label: 'Custom Networks', value: '3', accent: 'blue' },
  { label: 'Internal Only', value: '1', accent: 'amber' },
  { label: 'Connected Containers', value: '8', accent: 'green' },
]

export const networkRows: NetworkRow[] = [
  {
    id: 'bridge',
    name: 'bridge',
    shortId: 'a1b2c3d4e5f6',
    driver: 'bridge',
    scope: 'local',
    subnet: '172.17.0.0/16',
    gateway: '172.17.0.1',
    access: 'external',
    containers: [],
  },
  {
    id: 'host',
    name: 'host',
    shortId: 'b2c3d4e5f6g7',
    driver: 'host',
    scope: 'local',
    subnet: '-',
    gateway: '-',
    access: 'external',
    containers: [],
  },
  {
    id: 'app-network',
    name: 'app_network',
    shortId: 'c3d4e5f6g7h8',
    driver: 'bridge',
    scope: 'local',
    subnet: '172.18.0.0/16',
    gateway: '172.18.0.1',
    access: 'external',
    containers: ['nginx-proxy', 'api-server', '+1'],
  },
  {
    id: 'backend-network',
    name: 'backend_network',
    shortId: 'd4e5f6g7h8i9',
    driver: 'bridge',
    scope: 'local',
    subnet: '172.19.0.0/16',
    gateway: '172.19.0.1',
    access: 'internal',
    containers: ['postgres-db', 'redis-cache', '+1'],
  },
  {
    id: 'monitoring-network',
    name: 'monitoring_network',
    shortId: 'e5f6g7h8i9j0',
    driver: 'bridge',
    scope: 'local',
    subnet: '172.20.0.0/16',
    gateway: '172.20.0.1',
    access: 'external',
    containers: ['grafana', 'elasticsearch'],
  },
]

export const networkMenuActions: TableAction[] = [
  { label: 'Connect Container' },
  { label: 'View Details' },
  { label: 'Remove', tone: 'danger' },
]

export const monitoringOverview: OverviewMetric[] = [
  {
    label: 'CPU Usage',
    value: '35%',
    subvalue: '8 cores',
    progress: 35,
    accent: 'amber',
    leadingIcon: Cpu,
    breakdown: [
      { label: 'System', value: '12%' },
      { label: 'User', value: '23%' },
    ],
  },
  {
    label: 'Memory',
    value: '12.4 GB',
    subvalue: '/ 32 GB',
    progress: 39,
    accent: 'green',
    leadingIcon: Box,
    breakdown: [
      { label: 'Cached', value: '8.2 GB' },
      { label: 'Available', value: '19.6 GB' },
    ],
  },
  {
    label: 'Disk',
    value: '156 GB',
    subvalue: '/ 500 GB',
    progress: 31,
    accent: 'amber',
    leadingIcon: HardDrive,
    breakdown: [{ label: 'Available', value: '344 GB' }],
  },
  {
    label: 'Network',
    value: '',
    accent: 'purple',
    leadingIcon: Network,
    breakdown: [
      { label: 'Received', value: '45.6 GB', tone: 'green' },
      { label: 'Transmitted', value: '23.4 GB', tone: 'blue' },
      { label: '234 active connections', value: '' },
    ],
  },
]

export const monitoringRows: MonitoringRow[] = [
  {
    id: 'nginx-proxy',
    name: 'nginx-proxy',
    shortId: 'a1b2c3d4',
    cpu: 2.4,
    memoryUsed: '128 MB',
    memoryTotal: '512 MB',
    memoryProgress: 25,
    networkRx: '1.2 GB',
    networkTx: '856 MB',
    diskRead: '45 MB',
    diskWrite: '12 MB',
    pids: 4,
  },
  {
    id: 'postgres-db',
    name: 'postgres-db',
    shortId: 'b2c3d4e5',
    cpu: 8.2,
    memoryUsed: '512 MB',
    memoryTotal: '2048 MB',
    memoryProgress: 25,
    networkRx: '324 MB',
    networkTx: '1.8 GB',
    diskRead: '2.1 GB',
    diskWrite: '890 MB',
    pids: 12,
  },
  {
    id: 'redis-cache',
    name: 'redis-cache',
    shortId: 'c3d4e5f6',
    cpu: 0.8,
    memoryUsed: '64 MB',
    memoryTotal: '256 MB',
    memoryProgress: 25,
    networkRx: '567 MB',
    networkTx: '234 MB',
    diskRead: '12 MB',
    diskWrite: '8 MB',
    pids: 2,
  },
  {
    id: 'api-server',
    name: 'api-server',
    shortId: 'd4e5f6g7',
    cpu: 15.3,
    memoryUsed: '256 MB',
    memoryTotal: '1024 MB',
    memoryProgress: 25,
    networkRx: '2.3 GB',
    networkTx: '1.1 GB',
    diskRead: '156 MB',
    diskWrite: '78 MB',
    pids: 8,
  },
  {
    id: 'mongodb',
    name: 'mongodb',
    shortId: 'e5f6g7h8',
    cpu: 5.1,
    memoryUsed: '384 MB',
    memoryTotal: '1536 MB',
    memoryProgress: 25,
    networkRx: '189 MB',
    networkTx: '456 MB',
    diskRead: '1.5 GB',
    diskWrite: '678 MB',
    pids: 6,
  },
  {
    id: 'grafana',
    name: 'grafana',
    shortId: 'f6g7h8i9',
    cpu: 3.2,
    memoryUsed: '192 MB',
    memoryTotal: '512 MB',
    memoryProgress: 38,
    networkRx: '89 MB',
    networkTx: '234 MB',
    diskRead: '34 MB',
    diskWrite: '56 MB',
    pids: 4,
  },
]

export const settingsTabs = [
  { id: 'docker', label: 'Docker', icon: HardDrive },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
] as const

export type SettingsTabId = (typeof settingsTabs)[number]['id']

export const settingsHeaderActions = {
  reset: 'Reset',
  save: 'Save Changes',
}

export const pageIcons = {
  dashboard: Container,
  containers: Container,
  images: ImageIcon,
  volumes: HardDrive,
  networks: Network,
  monitoring: BrushCleaning,
  settings: Shield,
} as const
