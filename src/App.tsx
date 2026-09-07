import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import {
  Vector3,
  WebGPURenderer,
  type WebGPURendererParameters,
} from 'three/webgpu'
import {
  GLASS_INSTANCE_COUNT,
  InstancedGlassMosaic,
  MOSAIC_GRID_SIZE,
} from './components/InstancedGlassMosaic'
import {
  createGrayscaleProcessor,
  createGrayscaleMap,
  type GrayscaleMap,
} from './lib/grayscaleMap'
import './App.css'

const POINT_LIGHT_POSITION = new Vector3(0, 0, 5)
const DEFAULT_IMAGE_URL = '/lahmacun.avif'
const DEFAULT_IMAGE_NAME = 'lahmacun.avif'
const WEBCAM_FRAME_INTERVAL_MS = 1000 / 15

type InputMode = 'image' | 'webcam'
type WebcamStatus = 'idle' | 'starting' | 'active'

async function createRenderer(properties: unknown) {
  const renderer = new WebGPURenderer({
    ...(properties as WebGPURendererParameters),
    // The shadow function is native GLSL, so use Three's modern WebGL2
    // backend while retaining NodeMaterial transmitted-shadow support.
    forceWebGL: true,
  })

  await renderer.init()

  // Enables RGB + alpha information in the shadow texture. This is required
  // for NodeMaterial.castShadowNode to produce colored transparent shadows.
  renderer.shadowMap.transmitted = true

  return renderer
}

type SceneProps = {
  grayscaleValues: Uint8Array | null
}

function Scene({ grayscaleValues }: SceneProps) {
  return (
    <>
      <color attach="background" args={['#07090e']} />

      <ambientLight intensity={0.018} />
      <pointLight
        castShadow
        color="#fff7ea"
        decay={2}
        intensity={100}
        position={POINT_LIGHT_POSITION}
        shadow-bias={-0.00025}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={12}
      />

      {grayscaleValues && (
        <InstancedGlassMosaic
          grayscaleValues={grayscaleValues}
          lightPosition={POINT_LIGHT_POSITION}
        />
      )}

      <mesh receiveShadow position={[0, 0, -1.4]}>
        <planeGeometry args={[8.2, 8.2]} />
        <meshStandardMaterial
          color="#d7dddf"
          roughness={0.94}
          envMapIntensity={0}
        />
      </mesh>

      <Environment resolution={256}>
        <Lightformer
          color="#ffffff"
          intensity={2.2}
          position={[0, 4, 3]}
          scale={[7, 7, 1]}
        />
        <Lightformer
          color="#52d9d0"
          intensity={2.1}
          position={[-5, 0, 1]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[6, 6, 1]}
        />
        <Lightformer
          color="#6c329f"
          intensity={1.8}
          position={[5, 0, -1]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[6, 6, 1]}
        />
      </Environment>

      <OrbitControls
        makeDefault
        target={[0, 0, -0.2]}
        minDistance={70}
        maxDistance={130}
        enableDamping
      />
    </>
  )
}

function App() {
  const [grayscaleMap, setGrayscaleMap] = useState<GrayscaleMap | null>(null)
  const [webcamValues, setWebcamValues] = useState<Uint8Array | null>(null)
  const [inputMode, setInputMode] = useState<InputMode>('image')
  const [webcamStatus, setWebcamStatus] = useState<WebcamStatus>('idle')
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const [sourceName, setSourceName] = useState(DEFAULT_IMAGE_NAME)
  const [isProcessing, setIsProcessing] = useState(true)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const processingRequest = useRef(0)
  const webcamRequest = useRef(0)
  const webcamStream = useRef<MediaStream | null>(null)
  const webcamVideo = useRef<HTMLVideoElement>(null)
  const webcamProcessor = useMemo(
    () => createGrayscaleProcessor(MOSAIC_GRID_SIZE),
    [],
  )

  const processImage = useCallback(async (source: Blob, name: string) => {
    const request = processingRequest.current + 1
    processingRequest.current = request
    setIsProcessing(true)
    setProcessingError(null)

    try {
      const nextMap = await createGrayscaleMap(source, MOSAIC_GRID_SIZE)

      if (processingRequest.current !== request) return

      setGrayscaleMap(nextMap)
      setSourceName(name)
    } catch (error) {
      if (processingRequest.current !== request) return

      setProcessingError(
        error instanceof Error ? error.message : 'The image could not be read.',
      )
    } finally {
      if (processingRequest.current === request) setIsProcessing(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadDefaultImage() {
      try {
        const response = await fetch(DEFAULT_IMAGE_URL)

        if (!response.ok) throw new Error('The default image could not be loaded.')
        if (cancelled) return

        await processImage(await response.blob(), DEFAULT_IMAGE_NAME)
      } catch (error) {
        if (!cancelled) {
          setProcessingError(
            error instanceof Error
              ? error.message
              : 'The default image could not be loaded.',
          )
          setIsProcessing(false)
        }
      }
    }

    void loadDefaultImage()

    return () => {
      cancelled = true
    }
  }, [processImage])

  useEffect(() => {
    if (inputMode !== 'webcam' || webcamStatus !== 'active') return

    let animationFrame = 0
    let previousFrameTime = 0

    function updateWebcam(frameTime: number) {
      const video = webcamVideo.current

      if (
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        frameTime - previousFrameTime >= WEBCAM_FRAME_INTERVAL_MS
      ) {
        setWebcamValues(webcamProcessor.read(video, true))
        previousFrameTime = frameTime
      }

      animationFrame = requestAnimationFrame(updateWebcam)
    }

    animationFrame = requestAnimationFrame(updateWebcam)

    return () => cancelAnimationFrame(animationFrame)
  }, [inputMode, webcamProcessor, webcamStatus])

  useEffect(
    () => () => {
      webcamStream.current?.getTracks().forEach((track) => track.stop())
    },
    [],
  )

  const stopWebcam = useCallback(() => {
    webcamRequest.current += 1
    webcamStream.current?.getTracks().forEach((track) => track.stop())
    webcamStream.current = null

    if (webcamVideo.current) webcamVideo.current.srcObject = null

    setWebcamStatus('idle')
    setWebcamValues(null)
  }, [])

  async function startWebcam() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setWebcamError('Webcam is not supported by this browser.')
      return
    }

    const request = webcamRequest.current + 1
    webcamRequest.current = request
    setWebcamStatus('starting')
    setWebcamError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
      })

      if (webcamRequest.current !== request) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      const video = webcamVideo.current

      if (!video) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error('The webcam preview is not available.')
      }

      webcamStream.current = stream
      video.srcObject = stream
      await video.play()
      setWebcamStatus('active')
    } catch (error) {
      if (webcamRequest.current !== request) return

      webcamStream.current?.getTracks().forEach((track) => track.stop())
      webcamStream.current = null
      setWebcamStatus('idle')
      setWebcamError(
        error instanceof Error ? error.message : 'The webcam could not start.',
      )
    }
  }

  function selectInputMode(mode: InputMode) {
    if (mode === inputMode) return

    if (mode === 'image') stopWebcam()

    setWebcamError(null)
    setInputMode(mode)
  }

  function handleImageInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]

    if (!file) return

    event.currentTarget.value = ''
    void processImage(file, file.name)
  }

  const activeGrayscaleValues =
    inputMode === 'webcam' ? webcamValues : grayscaleMap?.values ?? null

  return (
    <main className="viewer">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [0, 0, 100], fov: 3.3 }}
        gl={createRenderer}
      >
        <Scene grayscaleValues={activeGrayscaleValues} />
      </Canvas>

      <aside className="spec-card" aria-label="Instanced glass mosaic details">
        <p className="eyebrow">Instanced glass mosaic</p>
        <div className="title-row">
          <h1>{MOSAIC_GRID_SIZE} × {MOSAIC_GRID_SIZE}</h1>
          <span className="instance-count">
            {GLASS_INSTANCE_COUNT.toLocaleString()} glass
          </span>
        </div>

        <div className="source-tabs" role="group" aria-label="Input source">
          <button
            type="button"
            aria-pressed={inputMode === 'image'}
            onClick={() => selectInputMode('image')}
          >
            Image
          </button>
          <button
            type="button"
            aria-pressed={inputMode === 'webcam'}
            onClick={() => selectInputMode('webcam')}
          >
            Webcam
          </button>
        </div>

        {inputMode === 'image' ? (
          <>
            <label className="source-action">
              <span>{isProcessing ? 'Processing image…' : 'Choose image'}</span>
              <input
                type="file"
                accept="image/*,.avif"
                disabled={isProcessing}
                onChange={handleImageInput}
              />
            </label>
            <p className="source-name" title={sourceName}>
              {sourceName} · client-side Canvas 2D
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              className="source-action"
              disabled={webcamStatus === 'starting'}
              onClick={
                webcamStatus === 'active'
                  ? stopWebcam
                  : () => void startWebcam()
              }
            >
              {webcamStatus === 'active'
                ? 'Stop webcam'
                : webcamStatus === 'starting'
                  ? 'Starting webcam…'
                  : 'Start webcam'}
            </button>
            <p className="source-name">
              {webcamStatus === 'active'
                ? 'Live · 15 FPS · client-side Canvas 2D'
                : 'Camera starts only after your permission'}
            </p>
          </>
        )}

        <div className="map-preview">
          {inputMode === 'webcam' ? (
            <video
              ref={webcamVideo}
              className="webcam-preview"
              aria-label="Grayscale webcam preview"
              autoPlay
              muted
              playsInline
            />
          ) : grayscaleMap ? (
            <img src={grayscaleMap.previewUrl} alt="64 by 64 grayscale map" />
          ) : (
            <div className="preview-placeholder" aria-hidden="true" />
          )}
          <div className="map-copy">
            <span>Grayscale → Y rotation</span>
            <strong>0 → 45°</strong>
            <strong>255 → 0°</strong>
          </div>
        </div>

        {inputMode === 'image' && processingError && (
          <p className="processing-error" role="alert">
            {processingError}
          </p>
        )}

        {inputMode === 'webcam' && webcamError && (
          <p className="processing-error" role="alert">
            {webcamError}
          </p>
        )}

        <dl className="render-stats">
          <div>
            <dt>Light</dt>
            <dd>center · Z +5</dd>
          </div>
          <div>
            <dt>Geometry</dt>
            <dd>one InstancedMesh</dd>
          </div>
          <div>
            <dt>Rendering</dt>
            <dd>one draw per pass</dd>
          </div>
        </dl>

        <p className="hint">Drag to orbit and inspect the angle-mapped tiles</p>
      </aside>
    </main>
  )
}

export default App
