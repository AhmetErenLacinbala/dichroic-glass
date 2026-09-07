import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  InstancedBufferAttribute,
  MathUtils,
  MeshPhysicalNodeMaterial,
  Object3D,
  type InstancedMesh,
  type Node,
  type Vector3,
} from 'three/webgpu'
import {
  cameraPosition,
  cos,
  glslFn,
  instancedBufferAttribute,
  normalize,
  positionWorld,
  sin,
  uniform,
  vec3,
} from 'three/tsl'
import glassShadowMapSource from '../shaders/glassShadowMap.glsl?raw'
import glassViewDiffuseSource from '../shaders/glassViewDiffuse.glsl?raw'

export const MOSAIC_GRID_SIZE = 64
export const GLASS_INSTANCE_COUNT = MOSAIC_GRID_SIZE * MOSAIC_GRID_SIZE

const TILE_SIZE = 0.074
const TILE_GAP = 0.008
const TILE_PITCH = TILE_SIZE + TILE_GAP
const TILE_THICKNESS = 0.02
const MAX_ROTATION_RADIANS = MathUtils.degToRad(45)

const glassShadowMapShader = glslFn(glassShadowMapSource)
const glassViewDiffuseShader = glslFn(glassViewDiffuseSource)

type InstancedGlassMosaicProps = {
  grayscaleValues: Uint8Array
  lightPosition: Vector3
}

function writeInstanceAngles(
  grayscaleValues: Uint8Array,
  angles: Float32Array,
) {
  if (grayscaleValues.length !== GLASS_INSTANCE_COUNT) {
    throw new Error(`Expected ${GLASS_INSTANCE_COUNT} grayscale values.`)
  }

  for (let index = 0; index < GLASS_INSTANCE_COUNT; index += 1) {
    const grayscale = grayscaleValues[index] / 255

    // Requested mapping: grayscale 0 -> 45 degrees, 255 -> 0 degrees.
    angles[index] = (1 - grayscale) * MAX_ROTATION_RADIANS
  }

}

function createInstancedGlassMaterial(
  lightPosition: Vector3,
  angleAttribute: InstancedBufferAttribute,
) {
  const material = new MeshPhysicalNodeMaterial({
    color: 0xe8fbff,
    transmission: 1,
    opacity: 1,
    thickness: TILE_THICKNESS,
    roughness: 0.055,
    metalness: 0,
    ior: 1.52,
    attenuationColor: 0xd8f7ff,
    attenuationDistance: 1.8,
    clearcoat: 0.3,
    clearcoatRoughness: 0.06,
  })

  // One float per instance is shared by the visible and shadow shaders.
  const instanceAngle = instancedBufferAttribute(
    angleAttribute,
    'float',
  ) as Node<'float'>
  const panelNormalWorld = normalize(
    vec3(sin(instanceAngle), 0, cos(instanceAngle)),
  )
  const cameraAngleColor = glassViewDiffuseShader(
    panelNormalWorld,
    positionWorld,
    cameraPosition,
  ) as Node<'vec3'>

  material.colorNode = cameraAngleColor
  material.attenuationColorNode = cameraAngleColor
  material.castShadowNode = glassShadowMapShader(
    panelNormalWorld,
    positionWorld,
    uniform(lightPosition),
  )

  return material
}

function updateInstances(
  mesh: InstancedMesh,
  angleAttribute: InstancedBufferAttribute,
  grayscaleValues: Uint8Array,
) {
  const angles = angleAttribute.array as Float32Array
  const transform = new Object3D()
  const center = (MOSAIC_GRID_SIZE - 1) * 0.5

  writeInstanceAngles(grayscaleValues, angles)

  for (let row = 0; row < MOSAIC_GRID_SIZE; row += 1) {
    for (let column = 0; column < MOSAIC_GRID_SIZE; column += 1) {
      const index = row * MOSAIC_GRID_SIZE + column

      transform.position.set(
        (column - center) * TILE_PITCH + 0.005,
        (center - row) * TILE_PITCH + 0.005,
        0,
      )
      transform.rotation.set(0, angles[index], 0)
      transform.updateMatrix()
      mesh.setMatrixAt(index, transform.matrix)
    }
  }

  angleAttribute.needsUpdate = true
  mesh.instanceMatrix.needsUpdate = true
}

/** 4,096 grayscale-driven glass tiles rendered by one InstancedMesh. */
export function InstancedGlassMosaic({
  grayscaleValues,
  lightPosition,
}: InstancedGlassMosaicProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const angleAttribute = useMemo(
    () =>
      new InstancedBufferAttribute(
        new Float32Array(GLASS_INSTANCE_COUNT),
        1,
      ),
    [],
  )
  const material = useMemo(
    () => createInstancedGlassMaterial(lightPosition, angleAttribute),
    [angleAttribute, lightPosition],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current

    if (!mesh) return

    updateInstances(mesh, angleAttribute, grayscaleValues)
  }, [angleAttribute, grayscaleValues])

  useEffect(() => () => material.dispose(), [material])

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, GLASS_INSTANCE_COUNT]}
      castShadow
      frustumCulled={false}
    >
      <boxGeometry args={[TILE_SIZE, TILE_SIZE, TILE_THICKNESS]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}
