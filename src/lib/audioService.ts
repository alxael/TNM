// audioService.ts
//
// Drives a Pure Data patch (src/assets/main.pd) directly in the browser via
// WebPd (https://github.com/sebpiq/WebPd). The patch is compiled ahead of
// time with `npm run pd:build`, which writes:
//
//   public/webpd/webpd-runtime.js   <- runtime, exposes `globalThis.WebPdRuntime`
//   public/webpd/patch.wasm         <- compiled audio graph
//
// WebPd only surfaces GUI-type Pd objects (msg, bang, nbx, ...) as JS-sendable
// receivers, so `main.pd` exposes input via a `[msg $1 $2 $3]` at object
// index 0 -- which WebPd predictably names `n_0_0`.

const WEBPD_RUNTIME_URL = '/webpd/webpd-runtime.js'
const WEBPD_PATCH_URL = '/webpd/patch.wasm'
const INPUT_NODE_ID = 'n_0_0'
const INPUT_PORTLET_ID = '0'

type WebPdRuntimeApi = {
  initialize(ctx: AudioContext): Promise<void>
  run(
    ctx: AudioContext,
    patch: ArrayBuffer,
    settings: unknown,
  ): Promise<AudioWorkletNode>
  defaultSettingsForRun(
    patchUrl: string,
    receive?: (nodeId: string, portletId: string, message: unknown[]) => void,
  ): unknown
}

type WindowWithWebPd = typeof globalThis & { WebPdRuntime?: WebPdRuntimeApi }

type AudioState = 'idle' | 'loading' | 'awaiting-gesture' | 'running' | 'paused'

class AudioService {
  private ctx: AudioContext | null = null
  private node: AudioWorkletNode | null = null
  private state: AudioState = 'idle'
  private loadPromise: Promise<void> | null = null
  private patchBuffer: ArrayBuffer | null = null
  private gestureHandler: (() => void) | null = null
  private shouldRun = false

  /** Boot WebPd (idempotent) and arm a one-shot gesture listener. */
  connect() {
    this.shouldRun = true
    void this.bootstrap()
    if (this.state === 'paused') {
      void this.resumeAudio()
    } else if (this.state !== 'idle' && this.state !== 'loading') {
      this.armGestureIfNeeded()
    }
  }

  /** Suspend audio without tearing down the worklet. */
  disconnect() {
    this.shouldRun = false
    this.removeGestureHandler()
    if (this.state === 'running' && this.ctx) {
      void this.ctx.suspend()
      this.state = 'paused'
      console.log('[AudioService] paused')
    }
  }

  sendData(x: number, y: number, z: number) {
    if (!this.node) return
    const cx = clamp(x, 0, 1)
    const cy = clamp(y, 0, 1.1)
    const cz = clamp(z, 0, 1)
    try {
      this.node.port.postMessage({
        type: 'io:messageReceiver',
        payload: {
          nodeId: INPUT_NODE_ID,
          portletId: INPUT_PORTLET_ID,
          message: [cx, cy, cz],
        },
      })
    } catch {
      // Worklet may not be fully wired yet; drop the sample.
    }
  }

  sendModulation(x: number, y: number, z: number) {
    this.sendData(x, y, z)
  }

  // --- internals -----------------------------------------------------------

  private bootstrap(): Promise<void> {
    if (this.loadPromise) return this.loadPromise
    this.state = 'loading'
    this.loadPromise = this.loadAndPrepare().catch((err) => {
      console.error('[AudioService] WebPd bootstrap failed:', err)
      this.state = 'idle'
      this.loadPromise = null
      throw err
    })
    return this.loadPromise
  }

  private async loadAndPrepare(): Promise<void> {
    await loadRuntimeScript(WEBPD_RUNTIME_URL)
    const runtime = (globalThis as WindowWithWebPd).WebPdRuntime
    if (!runtime) {
      throw new Error(
        'WebPdRuntime missing after script load. Did you run `npm run pd:build`?',
      )
    }

    this.ctx = new AudioContext()
    await runtime.initialize(this.ctx)

    const response = await fetch(WEBPD_PATCH_URL)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${WEBPD_PATCH_URL}: ${response.status}`)
    }
    this.patchBuffer = await response.arrayBuffer()

    this.state = 'awaiting-gesture'
    console.log('[AudioService] WebPd loaded; awaiting user gesture')
    this.armGestureIfNeeded()
  }

  private armGestureIfNeeded() {
    if (!this.shouldRun) return
    if (this.gestureHandler || this.state === 'running') return

    const handler = () => {
      this.removeGestureHandler()
      if (!this.shouldRun) return
      void this.startEngine()
    }
    this.gestureHandler = handler
    globalThis.addEventListener('pointerdown', handler, { once: true })
    globalThis.addEventListener('keydown', handler, { once: true })
  }

  private removeGestureHandler() {
    if (!this.gestureHandler) return
    globalThis.removeEventListener('pointerdown', this.gestureHandler)
    globalThis.removeEventListener('keydown', this.gestureHandler)
    this.gestureHandler = null
  }

  private async startEngine() {
    const runtime = (globalThis as WindowWithWebPd).WebPdRuntime
    if (!runtime || !this.ctx || !this.patchBuffer) return

    try {
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      if (!this.node) {
        const settings = runtime.defaultSettingsForRun(WEBPD_PATCH_URL)
        this.node = await runtime.run(this.ctx, this.patchBuffer, settings)
        this.node.connect(this.ctx.destination)
      }
      this.state = 'running'
      console.log('[AudioService] audio started')
    } catch (err) {
      console.error('[AudioService] audio start failed:', err)
      this.state = 'awaiting-gesture'
    }
  }

  private async resumeAudio() {
    if (!this.ctx) return
    try {
      await this.ctx.resume()
      this.state = 'running'
      console.log('[AudioService] audio resumed')
    } catch (err) {
      console.warn('[AudioService] resume failed:', err)
      this.state = 'awaiting-gesture'
      this.armGestureIfNeeded()
    }
  }
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value))
}

let runtimeScriptPromise: Promise<void> | null = null
function loadRuntimeScript(src: string): Promise<void> {
  if (runtimeScriptPromise) return runtimeScriptPromise
  if ((globalThis as WindowWithWebPd).WebPdRuntime) {
    runtimeScriptPromise = Promise.resolve()
    return runtimeScriptPromise
  }
  runtimeScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-webpd="true"]',
    )
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      )
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.webpd = 'true'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error(`Failed to load ${src}`)),
      { once: true },
    )
    document.head.appendChild(script)
  })
  return runtimeScriptPromise
}

export const audioService = new AudioService()
