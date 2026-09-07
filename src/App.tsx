import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import {
  MathUtils,
  Vector3,
  WebGPURenderer,
  type WebGPURendererParameters,
} from 'three/webgpu'
import { GlassPanel } from './components/GlassPanel'
import './App.css'

const POINT_LIGHT_POSITION = new Vector3(0, 0.52, 2.5)

async function createRenderer(properties: unknown) {
  const renderer = new WebGPURenderer(
    properties as WebGPURendererParameters,
  )

  await renderer.init()

  // Enables RGB + alpha information in the shadow texture. This is required
  // for NodeMaterial.castShadowNode to produce colored transparent shadows.
  renderer.shadowMap.transmitted = true

  return renderer
}

type SceneProps = {
  incidenceAngle: number
}

function Scene({ incidenceAngle }: SceneProps) {
  // The slider expresses the angle between the light ray and glass plane.
  // A 90° ray hits the glass face-on; a 0° ray runs along the glass plane.
  const panelRotationY = MathUtils.degToRad(90 - incidenceAngle)

  return (
    <>
      <color attach="background" args={['#11131b']} />

      <ambientLight intensity={0.03} />
      <pointLight
        castShadow
        color="#fff7ea"
        decay={2}
        intensity={34}
        position={POINT_LIGHT_POSITION}
        shadow-bias={-0.00025}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.1}
        shadow-camera-far={8}
      />

      <GlassPanel
        lightPosition={POINT_LIGHT_POSITION}
        position={[0, 0.52, 0]}
        rotation={[0, panelRotationY, 0]}
      />

      {/* The wall receives the angle-colored shadow written by the glass. */}
      <mesh receiveShadow position={[0, 1.15, -1.35]}>
        <planeGeometry args={[4.8, 3.2]} />
        <meshStandardMaterial
          color="#dce2e5"
          roughness={0.92}
          envMapIntensity={0}
        />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial
          color="#818a91"
          roughness={0.88}
          envMapIntensity={0}
        />
      </mesh>

      <mesh position={[-1.25, 0.16, -0.72]} castShadow>
        <boxGeometry args={[0.28, 0.32, 0.28]} />
        <meshStandardMaterial color="#e65f36" roughness={0.45} />
      </mesh>
      <mesh position={[1.15, 0.22, -0.8]} castShadow>
        <sphereGeometry args={[0.22, 40, 24]} />
        <meshStandardMaterial color="#496de8" roughness={0.32} />
      </mesh>

      <Environment resolution={256}>
        <Lightformer
          color="#ffffff"
          intensity={3}
          position={[0, 3, 2]}
          scale={[5, 5, 1]}
        />
        <Lightformer
          color="#79cfff"
          intensity={2.5}
          position={[-4, 1, 0]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[3, 3, 1]}
        />
        <Lightformer
          color="#6c3aa8"
          intensity={2}
          position={[4, 1, -1]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[3, 3, 1]}
        />
      </Environment>

      <OrbitControls
        makeDefault
        target={[0, 0.65, -0.25]}
        minDistance={1.8}
        maxDistance={6}
        enableDamping
      />
    </>
  )
}

function App() {
  const [incidenceAngle, setIncidenceAngle] = useState(70)

  return (
    <main className="viewer">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [1.7, 1.25, 3.25], fov: 38 }}
        gl={createRenderer}
      >
        <Scene incidenceAngle={incidenceAngle} />
      </Canvas>

      <aside className="spec-card" aria-label="Glass shadow controls">
        <p className="eyebrow">Angle-driven glass shadow</p>
        <div className="title-row">
          <h1>1 m × 1 m</h1>
          <span className="thickness">2 cm</span>
        </div>

        <label className="angle-control">
          <span>
            Light-to-plane angle
            <output>{incidenceAngle}°</output>
          </span>
          <input
            type="range"
            min="0"
            max="90"
            step="1"
            value={incidenceAngle}
            onInput={(event) =>
              setIncidenceAngle(Number(event.currentTarget.value))
            }
          />
        </label>

        <div className="shadow-gradient" aria-hidden="true" />
        <div className="gradient-labels">
          <span>0° · black · 96%</span>
          <span>90° · blue · 32%</span>
        </div>

        <p className="hint">Drag to orbit · Adjust the angle to test the shader</p>
      </aside>
    </main>
  )
}

export default App
