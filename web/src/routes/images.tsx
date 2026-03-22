import { Button } from '@/components/ui/button'
import { ResourcePage } from '@/components/app/resource-page'
import { imagesPage } from '@/lib/mock-data'

export function ImagesPage() {
  return (
    <ResourcePage
      {...imagesPage}
      toolbar={
        <Button variant="secondary" className="sm:min-w-36">
          Pull image
        </Button>
      }
    />
  )
}
