import { useEffect, useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import {
  MeshPhysicalNodeMaterial,
  type Vector3,
} from 'three/webgpu'
import {
  abs,
  clamp,
  color,
  dot,
  float,
  mix,
  modelNormalMatrix,
  normalize,
  positionWorld,
  smoothstep,
  uniform,
  vec3,
  vec4,
} from 'three/tsl'

export const GLASS_WIDTH_METERS = 1
export const GLASS_HEIGHT_METERS = 1
export const GLASS_THICKNESS_METERS = 0.02

type GlassPanelProps = ThreeElements['group'] & {
  lightPosition: Vector3
}

function createAngleShadowGlass(lightPosition: Vector3) {
  const material = new MeshPhysicalNodeMaterial({
    color: 0xe8fbff,
    transmission: 1,
    thickness: GLASS_THICKNESS_METERS,
    roughness: 0.035,
    metalness: 0,
    ior: 1.52,
    attenuationColor: 0xd8f7ff,
    attenuationDistance: 2.5,
    clearcoat: 0.35,
    clearcoatRoughness: 0.05,
  })

  const lightPositionNode = uniform(lightPosition)
  const directionToLight = normalize(lightPositionNode.sub(positionWorld))
  const panelNormalWorld = normalize(modelNormalMatrix.mul(vec3(0, 0, 1)))

  // Use the panel's fixed local +Z normal instead of the box face normal so
  // every shadow fragment responds to the glass object's rotation as a whole.
  // abs(dot(N, L)) maps the light-to-plane angle from 0° to 90°.
  const incidence = clamp(abs(dot(panelNormalWorld, directionToLight)), 0, 1)

  // Preserve a true black endpoint, quickly enter dark purple, then move
  // smoothly toward pale blue as the incidence angle approaches 90°.
  const purpleEntry = smoothstep(float(0), float(0.08), incidence)
  const blueProgress = smoothstep(float(0.35), float(1), incidence)
  const blackToPurple = mix(color('#000000'), color('#250047'), purpleEntry)
  const shadowColor = mix(blackToPurple, color('#9addff'), blueProgress)

  // Grazing incidence is dense; face-on incidence transmits more light.
  const shadowOpacity = mix(
    float(0.96),
    float(0.32),
    smoothstep(float(0), float(1), incidence),
  )

  material.castShadowNode = vec4(shadowColor, shadowOpacity)

  return material
}

/** A 1 m wide × 1 m high × 2 cm thick angle-shadow glass panel. */
export function GlassPanel({ lightPosition, ...props }: GlassPanelProps) {
  const material = useMemo(
    () => createAngleShadowGlass(lightPosition),
    [lightPosition],
  )

  useEffect(() => () => material.dispose(), [material])

  return (
    <group {...props}>
      <mesh castShadow>
        <boxGeometry
          args={[
            GLASS_WIDTH_METERS,
            GLASS_HEIGHT_METERS,
            GLASS_THICKNESS_METERS,
          ]}
        />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  )
}
