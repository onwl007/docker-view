import { Button } from '@/components/ui/button'
import { ResourcePage } from '@/components/app/resource-page'
import { networksPage } from '@/lib/mock-data'

export function NetworksPage() {
  return (
    <ResourcePage
      {...networksPage}
      toolbar={
        <Button variant="secondary" className="sm:min-w-36">
          Create network
        </Button>
      }
    />
  )
}
