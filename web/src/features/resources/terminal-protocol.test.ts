import { describe, expect, it } from 'vitest'
import { formatTerminalExitMessage, parseTerminalMessage } from '@/features/resources/terminal-protocol'

describe('terminal protocol helpers', () => {
  it('parses terminal socket payloads', () => {
    expect(parseTerminalMessage('{"type":"stdout","data":"hello"}')).toEqual({
      type: 'stdout',
      data: 'hello',
    })
  })

  it('rejects invalid terminal socket payloads', () => {
    expect(() => parseTerminalMessage('{"data":"hello"}')).toThrow('Invalid terminal message')
  })

  it('formats exit notices for terminal output', () => {
    expect(formatTerminalExitMessage(130)).toBe('\r\n[process exited with code 130]\r\n')
  })
})
