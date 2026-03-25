export type TerminalStatus = 'idle' | 'connecting' | 'ready' | 'closed' | 'error'

export interface TerminalMessage {
  type: string
  data?: string
  exitCode?: number
  message?: string
}

export function parseTerminalMessage(raw: string): TerminalMessage {
  const payload = JSON.parse(raw) as TerminalMessage

  if (!payload || typeof payload.type !== 'string' || payload.type.length === 0) {
    throw new Error('Invalid terminal message')
  }

  return payload
}

export function formatTerminalExitMessage(exitCode?: number): string {
  return `\r\n[process exited with code ${exitCode ?? 0}]\r\n`
}
