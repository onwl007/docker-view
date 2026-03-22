import { Button } from '@/components/ui/button'
import { ResourcePage } from '@/components/app/resource-page'
import { volumesPage } from '@/lib/mock-data'

export function VolumesPage() {
  return (
    <ResourcePage
      {...volumesPage}
      toolbar={
        <Button variant="secondary" className="sm:min-w-36">
          Create volume
        </Button>
      }
    />
  )
}
