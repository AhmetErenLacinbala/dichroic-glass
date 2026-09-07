import { useEffect, useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import {
  MeshPhysicalNodeMaterial,
  type Node,
  type Vector3,
} from 'three/webgpu'
import {
  cameraPosition,
  glslFn,
  modelNormalMatrix,
  normalize,
  positionWorld,
  uniform,
  vec3,
} from 'three/tsl'
import glassShadowMapSource from '../shaders/glassShadowMap.glsl?raw'
import glassViewDiffuseSource from '../shaders/glassViewDiffuse.glsl?raw'

export const GLASS_WIDTH_METERS = 1
export const GLASS_HEIGHT_METERS = 1
export const GLASS_THICKNESS_METERS = 0.02

type GlassPanelProps = ThreeElements['group'] & {
  lightPosition: Vector3
}

// Three injects this native GLSL function into the shadow-map fragment shader.
// The function itself—not JavaScript—calculates the final shadow RGB and alpha.
const glassShadowMapShader = glslFn(glassShadowMapSource)

// This native GLSL function runs in the visible material fragment shader.
// It only returns RGB, so it cannot change the glass opacity.
const glassViewDiffuseShader = glslFn(glassViewDiffuseSource)

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
  const panelNormalWorld = normalize(modelNormalMatrix.mul(vec3(0, 0, 1)))
  // glslFn's current typings erase the declared GLSL return type; the shader
  // declaration above guarantees this node is a vec3 at compile time.
  const cameraAngleColor = glassViewDiffuseShader(
    panelNormalWorld,
    positionWorld,
    cameraPosition,
  ) as Node<'vec3'>

  // Apply the shader RGB both to the diffuse surface and the transmitted tint.
  // Opacity and transmission remain fixed by the physical material settings.
  material.colorNode = cameraAngleColor
  material.attenuationColorNode = cameraAngleColor

  material.castShadowNode = glassShadowMapShader(
    panelNormalWorld,
    positionWorld,
    lightPositionNode,
  )

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
