import { Button } from '@/components/ui/button'
import { ResourcePage } from '@/components/app/resource-page'
import { containersPage } from '@/lib/mock-data'

export function ContainersPage() {
  return (
    <ResourcePage
      {...containersPage}
      toolbar={
        <Button variant="secondary" className="sm:min-w-36">
          Create container
        </Button>
      }
    />
  )
}
