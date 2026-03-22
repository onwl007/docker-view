import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges duplicate tailwind utilities predictably', () => {
    expect(cn('px-2 py-2', 'px-4', undefined)).toBe('py-2 px-4')
  })
})
