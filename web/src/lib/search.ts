export interface TextSearch {
  q?: string
}

export function validateTextSearch(search: Record<string, unknown>): TextSearch {
  const value = typeof search.q === 'string' ? search.q.trim() : ''

  if (!value) {
    return {}
  }

  return { q: value }
}
