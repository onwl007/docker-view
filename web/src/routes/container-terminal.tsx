import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { ArrowLeft, RefreshCw, Terminal } from 'lucide-react'
import {
  PageSection,
  PageToolbar,
  SectionHeading,
} from '@/components/app/docker-view-ui'
import { Button } from '@/components/ui/button'
import {
  formatTerminalExitMessage,
  parseTerminalMessage,
  type TerminalStatus,
} from '@/features/resources/terminal-protocol'
import {
  buildWebSocketUrl,
  createTerminalSession,
} from '@/lib/api/client'

const TERMINAL_COLS = 120
const TERMINAL_ROWS = 32

export function ContainerTerminalPage() {
  const { containerId } = useParams({ from: '/containers/$containerId/terminal' })
  const navigate = useNavigate()
  const terminalHostRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const connectAttemptRef = useRef(0)
  const [status, setStatus] = useState<TerminalStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!terminalRef.current) {
      return
    }

    terminalRef.current.options.disableStdin = status !== 'ready'
  }, [status])

  useEffect(() => {
    const host = terminalHostRef.current
    if (!host) {
      return
    }

    const terminal = new XTerm({
      cols: TERMINAL_COLS,
      rows: TERMINAL_ROWS,
      cursorBlink: true,
      cursorStyle: 'block',
      cursorInactiveStyle: 'outline',
      convertEol: true,
      fontFamily: '"IBM Plex Mono", Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      fontWeight: '400',
      lineHeight: 1.25,
      scrollback: 5000,
      theme: {
        background: '#0b1220',
        foreground: '#d6e2ff',
        cursor: '#f8fafc',
        cursorAccent: '#0b1220',
        selectionBackground: 'rgba(96, 165, 250, 0.28)',
        black: '#0f172a',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e2e8f0',
        brightBlack: '#475569',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde047',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#f8fafc',
      },
    })
    const fitAddon = new FitAddon()

    terminal.loadAddon(fitAddon)
    terminal.open(host)
    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    const syncTerminalSize = () => {
      const currentTerminal = terminalRef.current
      const currentFitAddon = fitAddonRef.current
      if (!currentTerminal || !currentFitAddon) {
        return
      }

      currentFitAddon.fit()
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'resize',
            cols: currentTerminal.cols,
            rows: currentTerminal.rows,
          }),
        )
      }
    }

    resizeObserverRef.current = new ResizeObserver(() => {
      syncTerminalSize()
    })
    resizeObserverRef.current.observe(host)

    const dataDisposable = terminal.onData((data) => {
      if (socketRef.current?.readyState !== WebSocket.OPEN) {
        return
      }
      socketRef.current.send(JSON.stringify({ type: 'stdin', data }))
    })

    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      if (socketRef.current?.readyState !== WebSocket.OPEN) {
        return
      }
      socketRef.current.send(JSON.stringify({ type: 'resize', cols, rows }))
    })

    const timerId = window.setTimeout(() => {
      syncTerminalSize()
      terminal.focus()
    }, 0)

    return () => {
      window.clearTimeout(timerId)
      dataDisposable.dispose()
      resizeDisposable.dispose()
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      connectAttemptRef.current += 1
      const socket = socketRef.current
      socketRef.current = null
      if (socket) {
        socket.onopen = null
        socket.onmessage = null
        socket.onerror = null
        socket.onclose = null
        socket.close()
      }
      fitAddonRef.current = null
      terminalRef.current = null
      terminal.dispose()
    }
  }, [])

  const closeCurrentSession = useCallback((reason: 'disconnect' | 'reconnect' | 'unmount' = 'disconnect') => {
    const socket = socketRef.current
    socketRef.current = null

    if (socket) {
      socket.onopen = null
      socket.onmessage = null
      socket.onerror = null
      socket.onclose = null

      if (reason === 'disconnect' && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'close' }))
      }

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
    }

    if (reason === 'disconnect') {
      terminalRef.current?.write('\r\n[terminal disconnected]\r\n')
      setStatus('closed')
      setErrorMessage('')
    }
  }, [])

  const connect = useCallback(async () => {
    const terminal = terminalRef.current
    const fitAddon = fitAddonRef.current
    if (!terminal || !fitAddon) {
      return
    }

    const attempt = connectAttemptRef.current + 1
    connectAttemptRef.current = attempt
    closeCurrentSession('reconnect')
    setStatus('connecting')
    setErrorMessage('')
    terminal.clear()
    terminal.writeln('\x1b[90mConnecting to container shell...\x1b[0m')

    fitAddon.fit()
    const dimensions = fitAddon.proposeDimensions()
    const cols = dimensions?.cols ?? terminal.cols ?? TERMINAL_COLS
    const rows = dimensions?.rows ?? terminal.rows ?? TERMINAL_ROWS

    try {
      const session = await createTerminalSession(containerId, {
        command: ['/bin/sh'],
        tty: true,
        cols,
        rows,
      })
      if (connectAttemptRef.current !== attempt) {
        return
      }

      const socket = new WebSocket(buildWebSocketUrl(session.websocketPath))
      socketRef.current = socket

      socket.onopen = () => {
        if (connectAttemptRef.current !== attempt) {
          return
        }
        setStatus('ready')
        fitAddon.fit()
        socket.send(JSON.stringify({ type: 'resize', cols: terminal.cols, rows: terminal.rows }))
        terminal.focus()
      }

      socket.onmessage = (event) => {
        if (connectAttemptRef.current !== attempt) {
          return
        }
        const payload = parseTerminalMessage(event.data)
        if (payload.type === 'stdout' || payload.type === 'stderr') {
          terminal.write(payload.data ?? '')
          return
        }

        if (payload.type === 'exit') {
          setStatus('closed')
          terminal.write(formatTerminalExitMessage(payload.exitCode))
          return
        }

        if (payload.type === 'error') {
          setStatus('error')
          setErrorMessage(payload.message ?? 'Terminal session failed.')
          terminal.writeln(`\x1b[31m${payload.message ?? 'Terminal session failed.'}\x1b[0m`)
        }
      }

      socket.onerror = () => {
        if (connectAttemptRef.current !== attempt) {
          return
        }
        setStatus('error')
        setErrorMessage('Terminal socket failed.')
        terminal.writeln('\x1b[31mTerminal socket failed.\x1b[0m')
      }

      socket.onclose = () => {
        if (connectAttemptRef.current !== attempt) {
          return
        }
        setStatus((current) => (current === 'error' ? current : 'closed'))
      }
    } catch (error) {
      if (connectAttemptRef.current !== attempt) {
        return
      }
      setStatus('error')
      const message = error instanceof Error ? error.message : 'Failed to create terminal session.'
      setErrorMessage(message)
      terminal.writeln(`\x1b[31m${message}\x1b[0m`)
    }
  }, [closeCurrentSession, containerId])

  useEffect(() => {
    if (!terminalRef.current) {
      return
    }

    const timerId = window.setTimeout(() => {
      void connect()
    }, 0)

    return () => {
      window.clearTimeout(timerId)
      connectAttemptRef.current += 1
      closeCurrentSession('unmount')
    }
  }, [closeCurrentSession, connect])

  function disconnect() {
    closeCurrentSession('disconnect')
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <PageToolbar
        title="Container Terminal"
        description={`Interactive shell for ${containerId}`}
        icon={Terminal}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => void navigate({ to: '/containers' })}>
              <ArrowLeft className="h-4 w-4" />
              Back to Containers
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void connect()}>
              <RefreshCw className="h-4 w-4" />
              Reconnect
            </Button>
            <Button size="sm" variant="ghost" onClick={disconnect} disabled={status !== 'ready'}>
              Disconnect
            </Button>
          </>
        }
      />

      {errorMessage ? (
        <PageSection className="px-4 py-3 text-sm text-[#b24b4b]">{errorMessage}</PageSection>
      ) : null}

      <PageSection className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SectionHeading
          icon={Terminal}
          title="Session"
          description={`Connection status: ${status}. This is a full TTY-backed web terminal.`}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
          <div
            className="relative min-h-0 flex-1 rounded-[1.4rem] border border-[rgba(17,17,17,0.08)] bg-[#08101d] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div
              ref={terminalHostRef}
              className={`terminal-shell h-full min-h-[420px] rounded-[1rem] bg-[#0b1220] px-3 py-3 transition-opacity ${
                status === 'ready' ? 'opacity-100' : 'opacity-75'
              }`}
            />
            {status !== 'ready' ? (
              <div className="pointer-events-none absolute inset-[10px] flex items-start justify-end rounded-[1rem] bg-[linear-gradient(180deg,rgba(8,16,29,0.08),rgba(8,16,29,0.32))] p-4">
                <div className="rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(8,16,29,0.82)] px-3 py-1.5 text-xs font-medium tracking-[0.04em] text-[#d6e2ff]">
                  {status === 'connecting' ? 'Connecting...' : status === 'error' ? 'Session Error' : 'Session Closed'}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[#f8f8f8] px-4 py-3 text-sm text-[#5b5b5b]">
            {status === 'ready'
              ? 'Click into the terminal to focus it. Selection, paste, shell history, prompt rendering, and full-width terminal layout now come from xterm.js.'
              : 'This session is not interactive right now. Use Reconnect to start a fresh shell or Back to Containers to leave this page.'}
          </div>
        </div>
      </PageSection>
    </div>
  )
}
