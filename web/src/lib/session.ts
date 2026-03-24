export interface UnauthorizedState {
  code: 'unauthorized' | 'forbidden'
  message: string
}

type Listener = (state: UnauthorizedState | null) => void

let currentState: UnauthorizedState | null = null
const listeners = new Set<Listener>()

export function subscribeUnauthorizedState(listener: Listener) {
  listeners.add(listener)
  listener(currentState)

  return () => {
    listeners.delete(listener)
  }
}

export function markUnauthorized(state: UnauthorizedState) {
  currentState = state
  for (const listener of listeners) {
    listener(currentState)
  }
}

export function clearUnauthorized() {
  currentState = null
  for (const listener of listeners) {
    listener(currentState)
  }
}
