import { useEffect, useRef, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { RefreshCw, Send, Terminal } from 'lucide-react'
import {
  PageSection,
  PageToolbar,
  SectionHeading,
} from '@/components/app/docker-view-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  buildWebSocketUrl,
  createTerminalSession,
} from '@/lib/api/client'

type TerminalStatus = 'idle' | 'connecting' | 'ready' | 'closed' | 'error'

interface TerminalMessage {
  type: string
  data?: string
  exitCode?: number
  message?: string
}

export function ContainerTerminalPage() {
  const { containerId } = useParams({ from: '/containers/$containerId/terminal' })
  const socketRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<TerminalStatus>('idle')
  const [output, setOutput] = useState<string[]>([])
  const [command, setCommand] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    void connect()

    return () => {
      socketRef.current?.close()
      socketRef.current = null
    }
    // Intentionally reconnect when the container changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId])

  async function connect() {
    socketRef.current?.close()
    socketRef.current = null
    setStatus('connecting')
    setErrorMessage('')

    try {
      const session = await createTerminalSession(containerId, {
        command: ['/bin/sh'],
        tty: true,
        cols: 120,
        rows: 32,
      })

      const socket = new WebSocket(buildWebSocketUrl(session.websocketPath))
      socketRef.current = socket

      socket.onopen = () => {
        setStatus('ready')
        socket.send(JSON.stringify({ type: 'resize', cols: 120, rows: 32 }))
      }

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as TerminalMessage
        if (payload.type === 'stdout' || payload.type === 'stderr') {
          setOutput((current) => [...current, payload.data ?? ''])
          return
        }

        if (payload.type === 'exit') {
          setStatus('closed')
          setOutput((current) => [...current, `\n[exit ${payload.exitCode ?? 0}]\n`])
          return
        }

        if (payload.type === 'error') {
          setStatus('error')
          setErrorMessage(payload.message ?? 'Terminal session failed.')
        }
      }

      socket.onerror = () => {
        setStatus('error')
        setErrorMessage('Terminal socket failed.')
      }

      socket.onclose = () => {
        setStatus((current) => (current === 'error' ? current : 'closed'))
      }
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create terminal session.')
    }
  }

  function sendInput() {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !command.trim()) {
      return
    }

    const data = `${command}\n`
    socketRef.current.send(JSON.stringify({ type: 'stdin', data }))
    setOutput((current) => [...current, `$ ${command}\n`])
    setCommand('')
  }

  function disconnect() {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'close' }))
    }
    socketRef.current?.close()
    socketRef.current = null
    setStatus('closed')
  }

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Container Terminal"
        description={`Interactive shell for ${containerId}`}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => void connect()}>
              <RefreshCw className="h-4 w-4" />
              Reconnect
            </Button>
            <Button size="sm" variant="ghost" onClick={disconnect}>
              Disconnect
            </Button>
          </>
        }
      />

      {errorMessage ? (
        <PageSection className="px-4 py-3 text-sm text-[#b24b4b]">{errorMessage}</PageSection>
      ) : null}

      <PageSection className="flex flex-col">
        <SectionHeading
          icon={Terminal}
          title="Session"
          description={`Connection status: ${status}`}
        />
        <div className="space-y-4 px-4 py-4">
          <div className="min-h-[420px] overflow-auto rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[#0d1117] p-4 font-mono text-sm text-[#d7e3f4]">
            {output.length === 0 ? (
              <div className="text-[#7c8aa5]">Waiting for terminal output...</div>
            ) : (
              output.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap break-words">
                  {line}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  sendInput()
                }
              }}
              placeholder="Type a shell command and press Enter"
              className="h-10 rounded-xl border-[rgba(17,17,17,0.08)] bg-white px-4 text-sm shadow-[0_1px_2px_rgba(17,17,17,0.04)]"
            />
            <Button size="sm" variant="default" onClick={sendInput} disabled={status !== 'ready'}>
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </PageSection>
    </div>
  )
}
