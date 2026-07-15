import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 3600  // 1h — enrichment kann lang dauern

const VALID_STAGES = new Set(['process', 'all', 'radar', 'enrichment', 'scoring', 'dossier', 'digest', 'dedup'])

/**
 * GET /api/pipeline/run?stage=process
 *
 * Server-Sent Events stream: startet Python main.py --stage <stage>
 * und streamt stdout/stderr live zurück.
 * stage=process  → enrichment + scoring + digest (kein Radar)
 * stage=all      → Vollständige Pipeline (Radar + Broker + Process)
 */
export async function GET(req: NextRequest) {
  const stage = req.nextUrl.searchParams.get('stage') ?? 'process'

  if (!VALID_STAGES.has(stage)) {
    return new Response(`data: [Fehler: unbekannte Stage "${stage}"]\n\n`, {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  // Pipeline-Verzeichnis: von apps/web/ zwei Ebenen hoch → services/pipeline
  const pipelineDir = path.join(process.cwd(), '..', '..', 'services', 'pipeline')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) => {
        // SSE format: "data: <text>\n\n"
        for (const line of text.split('\n')) {
          if (line.trim()) {
            controller.enqueue(encoder.encode(`data: ${line}\n\n`))
          }
        }
      }

      send(`[Pipeline: Stage "${stage}" startet…]`)

      const child = spawn('python', ['-u', 'main.py', '--stage', stage], {
        cwd: pipelineDir,
        shell: process.platform === 'win32',
        env: { ...process.env },
      })

      child.stdout.on('data', (data: Buffer) => {
        send(data.toString())
      })

      child.stderr.on('data', (data: Buffer) => {
        send(data.toString())
      })

      child.on('close', (code: number | null) => {
        send(`[Pipeline beendet — Exit ${code ?? '?'}]`)
        controller.close()
      })

      child.on('error', (err: Error) => {
        send(`[Fehler beim Starten: ${err.message}]`)
        controller.close()
      })

      // Abort: wenn Client disconnect → Kind-Prozess beenden
      req.signal.addEventListener('abort', () => {
        child.kill('SIGTERM')
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',  // nginx: disable buffering
    },
  })
}
