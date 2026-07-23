import { config } from '@/lib/config'
import { requireRemoteAuth } from '@/lib/remote/guard'
import { listPeers } from '@/lib/remote/peers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Aggregate health — one call tells the client everything it wants to show:
 * is the brain up, what model, how many devices are paired, what version.
 *
 * Guarded like every other surface: with remote mode off the server is bound to
 * loopback and only this machine can call it; with it on, the caller must already
 * be paired. A phone that is paired calls this to render "JARVIS online · qwen2.5:3b
 * · 2 devices" instead of guessing from a pile of separate probes.
 */
export async function GET(request: Request): Promise<Response> {
  const unauthorized = requireRemoteAuth(request)
  if (unauthorized) return unauthorized

  const base = {
    ok: true,
    version: '3.0.0',
    remote: config.remote,
    provider: config.provider,
    model: config.model,
  }

  // Ollama is the only provider with a local daemon to check.
  let brain: { ok: boolean; reason?: string } = { ok: true }
  if (config.provider === 'ollama') {
    try {
      const res = await fetch(`${config.ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(2500),
        cache: 'no-store',
      })
      brain = res.ok
        ? { ok: true }
        : { ok: false, reason: 'daemon-error' }
    } catch {
      brain = { ok: false, reason: 'unreachable' }
    }
  }

  const peers = listPeers()
  const pairedDevices = peers.filter((p) => p.lastSeen).length

  return Response.json({
    ...base,
    brain,
    pairedDevices,
    totalDevices: peers.length,
  })
}
