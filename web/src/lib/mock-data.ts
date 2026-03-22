import {
  Cuboid,
  Gauge,
  HardDrive,
  Home,
  Image as ImageIcon,
  Network,
} from 'lucide-react'

export const navigationItems = [
  {
    to: '/',
    label: 'Dashboard',
    icon: Home,
    note: 'Host summary',
  },
  {
    to: '/containers',
    label: 'Containers',
    icon: Cuboid,
    note: 'Runtime workloads',
  },
  {
    to: '/images',
    label: 'Images',
    icon: ImageIcon,
    note: 'Build artifacts',
  },
  {
    to: '/volumes',
    label: 'Volumes',
    icon: HardDrive,
    note: 'Persistent storage',
  },
  {
    to: '/networks',
    label: 'Networks',
    icon: Network,
    note: 'Connectivity maps',
  },
] as const

export const dashboardSummary = [
  {
    label: 'Active containers',
    value: '14',
    hint: '10 running, 2 paused, 2 exited in the last 24 hours.',
  },
  {
    label: 'Image footprint',
    value: '28.6 GB',
    hint: 'Layer storage is concentrated in five build chains.',
  },
  {
    label: 'Host pressure',
    value: '61%',
    hint: 'CPU and I/O remain inside a safe operator window.',
  },
] as const

export const containersPage = {
  badge: 'Containers',
  title: 'Inspect live workloads with a compact queue-first view.',
  description:
    'The containers workspace keeps the busiest services at the top, with enough metadata to act before drilling into logs or terminal access.',
  searchPlaceholder: 'Filter by name, image, project, or status',
  overview: [
    {
      label: 'Running',
      value: '10',
      hint: 'Core API, gateway, workers, and three app stacks are healthy.',
    },
    {
      label: 'Attention needed',
      value: '2',
      hint: 'One paused worker and one crash-looping migration job.',
    },
    {
      label: 'Published ports',
      value: '17',
      hint: 'Public and internal forwards are visible at a glance.',
    },
  ],
  columns: [
    { key: 'runtime', label: 'Runtime' },
    { key: 'ports', label: 'Ports' },
    { key: 'project', label: 'Project' },
  ],
  rows: [
    {
      id: 'api',
      primary: 'docker-view-api',
      secondary: 'ghcr.io/docker-view/api:0.5.1',
      status: 'Running',
      values: {
        runtime: '18h uptime',
        ports: '8080 -> 80',
        project: 'docker-view-prod',
      },
    },
    {
      id: 'web',
      primary: 'docker-view-web',
      secondary: 'ghcr.io/docker-view/web:0.5.1',
      status: 'Running',
      values: {
        runtime: '18h uptime',
        ports: '3000 -> 80',
        project: 'docker-view-prod',
      },
    },
    {
      id: 'worker',
      primary: 'metrics-worker',
      secondary: 'ghcr.io/docker-view/metrics:nightly',
      status: 'Paused',
      values: {
        runtime: '9m paused',
        ports: 'none',
        project: 'telemetry',
      },
    },
    {
      id: 'postgres',
      primary: 'postgres-primary',
      secondary: 'postgres:16-alpine',
      status: 'Healthy',
      values: {
        runtime: '4d uptime',
        ports: '5432 -> 5432',
        project: 'docker-view-prod',
      },
    },
  ],
  detailsTitle: 'Selected container',
  detailsDescription:
    'A right-side details card mirrors OrbStack’s quick-inspect pattern, keeping key metadata visible during list navigation.',
  detailSections: [
    {
      title: 'Runtime envelope',
      items: [
        { label: 'Container ID', value: 'fd9c1e2a31b7' },
        { label: 'Restart policy', value: 'unless-stopped' },
        { label: 'CPU / Memory', value: '0.38 cores / 412 MiB' },
      ],
    },
    {
      title: 'Network surface',
      items: [
        { label: 'Primary network', value: 'frontend' },
        { label: 'Published ports', value: '80/tcp, 443/tcp' },
        { label: 'Attached aliases', value: 'api, docker-view-api' },
      ],
    },
    {
      title: 'Operator actions',
      items: [
        { label: 'Next action', value: 'Open logs tail' },
        { label: 'Risk note', value: 'Public ingress workload' },
      ],
    },
  ],
}

export const imagesPage = {
  badge: 'Images',
  title: 'Track build artifacts and storage cost without losing tag context.',
  description:
    'The images view emphasizes provenance, digest lineage, and practical cleanup signals so operators can spot stale layers fast.',
  searchPlaceholder: 'Search by repository, tag, or digest',
  overview: [
    {
      label: 'Total images',
      value: '42',
      hint: 'Nine of them are dangling and can be reviewed for cleanup.',
    },
    {
      label: 'Largest chain',
      value: '6.7 GB',
      hint: 'Analytics and ML sidecars dominate the current cache.',
    },
    {
      label: 'Recently pulled',
      value: '7',
      hint: 'Pulled in the last 48 hours across three Compose projects.',
    },
  ],
  columns: [
    { key: 'size', label: 'Size' },
    { key: 'usedBy', label: 'Used by' },
    { key: 'updated', label: 'Updated' },
  ],
  rows: [
    {
      id: 'api-image',
      primary: 'ghcr.io/docker-view/api:0.5.1',
      secondary: 'sha256:24b51d…a92c',
      status: 'Ready',
      values: {
        size: '1.2 GB',
        usedBy: '3 containers',
        updated: '2 days ago',
      },
    },
    {
      id: 'web-image',
      primary: 'ghcr.io/docker-view/web:0.5.1',
      secondary: 'sha256:ae19fd…51ee',
      status: 'Ready',
      values: {
        size: '824 MB',
        usedBy: '2 containers',
        updated: '2 days ago',
      },
    },
    {
      id: 'postgres-image',
      primary: 'postgres:16-alpine',
      secondary: 'docker.io/library/postgres',
      status: 'Ready',
      values: {
        size: '391 MB',
        usedBy: '1 container',
        updated: '6 days ago',
      },
    },
    {
      id: 'dangling-image',
      primary: '<none>:<none>',
      secondary: 'sha256:4430cc…2fd9',
      status: 'Warning',
      values: {
        size: '2.4 GB',
        usedBy: '0 containers',
        updated: '11 days ago',
      },
    },
  ],
  detailsTitle: 'Selected image',
  detailsDescription:
    'Image details stay close to the list so you can compare size, tags, and live usage without opening a modal flow.',
  detailSections: [
    {
      title: 'Identity',
      items: [
        { label: 'Digest', value: 'sha256:24b51d9a…a92c' },
        { label: 'Architecture', value: 'linux/amd64' },
        { label: 'Created from', value: 'docker-view/api Dockerfile' },
      ],
    },
    {
      title: 'Consumption',
      items: [
        { label: 'Active containers', value: '3' },
        { label: 'Shared layers', value: '12' },
        { label: 'Potential reclaim', value: '0.0 GB while in use' },
      ],
    },
  ],
}

export const volumesPage = {
  badge: 'Volumes',
  title: 'Keep persistent data visible before any destructive maintenance.',
  description:
    'The volumes workspace favors attachment state, mount targets, and retention risk so cleanup decisions stay deliberate.',
  searchPlaceholder: 'Search by volume, scope, label, or mount path',
  overview: [
    {
      label: 'Attached volumes',
      value: '11',
      hint: 'Most are bound to database, registry, and backup workloads.',
    },
    {
      label: 'Unattached',
      value: '3',
      hint: 'Candidates for audit before prune or archive.',
    },
    {
      label: 'Largest volume',
      value: '148 GB',
      hint: 'Primary PostgreSQL data volume remains the heaviest mount.',
    },
  ],
  columns: [
    { key: 'mountpoint', label: 'Mountpoint' },
    { key: 'attachedTo', label: 'Attached to' },
    { key: 'scope', label: 'Scope' },
  ],
  rows: [
    {
      id: 'pgdata',
      primary: 'pgdata-prod',
      secondary: '/var/lib/postgresql/data',
      status: 'Attached',
      values: {
        mountpoint: '/var/lib/docker/volumes/pgdata-prod',
        attachedTo: 'postgres-primary',
        scope: 'local',
      },
    },
    {
      id: 'registry-cache',
      primary: 'registry-cache',
      secondary: '/var/lib/registry',
      status: 'Attached',
      values: {
        mountpoint: '/var/lib/docker/volumes/registry-cache',
        attachedTo: 'registry-cache',
        scope: 'local',
      },
    },
    {
      id: 'ci-workspace',
      primary: 'ci-workspace-tmp',
      secondary: '/workspace',
      status: 'Detached',
      values: {
        mountpoint: '/var/lib/docker/volumes/ci-workspace-tmp',
        attachedTo: 'none',
        scope: 'local',
      },
    },
    {
      id: 'backups',
      primary: 'nightly-backups',
      secondary: '/backups',
      status: 'Attached',
      values: {
        mountpoint: '/var/lib/docker/volumes/nightly-backups',
        attachedTo: 'backup-runner',
        scope: 'local',
      },
    },
  ],
  detailsTitle: 'Selected volume',
  detailsDescription:
    'Volume inspection keeps ownership and impact clear so storage operations do not become guesswork.',
  detailSections: [
    {
      title: 'Attachment map',
      items: [
        { label: 'Attached container', value: 'postgres-primary' },
        { label: 'Mount target', value: '/var/lib/postgresql/data' },
        { label: 'Read / write', value: 'rw' },
      ],
    },
    {
      title: 'Retention',
      items: [
        { label: 'Created', value: '17 Jan 2026' },
        { label: 'Estimated size', value: '148 GB' },
        { label: 'Risk note', value: 'Stateful production data' },
      ],
    },
  ],
}

export const networksPage = {
  badge: 'Networks',
  title: 'See service connectivity the way operators debug it in practice.',
  description:
    'The network workspace highlights driver, scope, subnet, and attachment count so routing problems are easier to isolate from the UI shell.',
  searchPlaceholder: 'Search by network, driver, subnet, or project',
  overview: [
    {
      label: 'Defined networks',
      value: '8',
      hint: 'Bridge networks dominate, with one host and one overlay path.',
    },
    {
      label: 'Attached endpoints',
      value: '23',
      hint: 'Frontend and internal service meshes hold most traffic paths.',
    },
    {
      label: 'Custom subnets',
      value: '5',
      hint: 'Three are Compose-managed, two are manually provisioned.',
    },
  ],
  columns: [
    { key: 'driver', label: 'Driver' },
    { key: 'subnet', label: 'Subnet' },
    { key: 'endpoints', label: 'Endpoints' },
  ],
  rows: [
    {
      id: 'frontend',
      primary: 'frontend',
      secondary: 'docker-view-prod',
      status: 'Ready',
      values: {
        driver: 'bridge',
        subnet: '172.22.0.0/24',
        endpoints: '6 attached',
      },
    },
    {
      id: 'backend',
      primary: 'backend',
      secondary: 'docker-view-prod',
      status: 'Ready',
      values: {
        driver: 'bridge',
        subnet: '172.23.0.0/24',
        endpoints: '8 attached',
      },
    },
    {
      id: 'telemetry',
      primary: 'telemetry',
      secondary: 'metrics pipeline',
      status: 'Ready',
      values: {
        driver: 'bridge',
        subnet: '172.24.0.0/24',
        endpoints: '4 attached',
      },
    },
    {
      id: 'debug-host',
      primary: 'debug-host',
      secondary: 'operator shortcut',
      status: 'Pending',
      values: {
        driver: 'host',
        subnet: 'host namespace',
        endpoints: '1 attached',
      },
    },
  ],
  detailsTitle: 'Selected network',
  detailsDescription:
    'Fast access to addressing and endpoint count makes it easier to reason about cross-service failures without leaving the main workspace.',
  detailSections: [
    {
      title: 'Addressing',
      items: [
        { label: 'Driver', value: 'bridge' },
        { label: 'Subnet', value: '172.22.0.0/24' },
        { label: 'Gateway', value: '172.22.0.1' },
      ],
    },
    {
      title: 'Attachments',
      items: [
        { label: 'Containers', value: 'docker-view-api, web, gateway, auth' },
        { label: 'Ingress role', value: 'Public edge path' },
        { label: 'Isolation note', value: 'Only frontend services attached' },
      ],
    },
  ],
}

export const hostSnapshot = [
  {
    label: 'CPU load',
    value: '2.8 / 8 cores',
    hint: 'Healthy operator range',
  },
  {
    label: 'Memory',
    value: '9.4 / 16 GB',
    hint: 'Containers remain under target',
  },
  {
    label: 'Disk pressure',
    value: '312 / 512 GB',
    hint: 'Image cache trending upward',
  },
] as const

export const controlDeck = [
  {
    label: 'Focus',
    value: 'Prod host / ap-southeast',
  },
  {
    label: 'Compose stacks',
    value: '4 active',
  },
  {
    label: 'Alerts',
    value: '1 paused workload',
  },
] as const

export const performancePulse = [
  { label: 'Container startup median', value: '1.2s' },
  { label: 'Image pull queue', value: '2 pending' },
  { label: 'Volume backup window', value: '02:00 UTC' },
] as const

export const hostGauge = Gauge
