vec3 glassViewDiffuse(
  vec3 panelNormalWorld,
  vec3 fragmentWorldPosition,
  vec3 cameraWorldPosition
) {
  // The angle is measured from the glass plane: grazing = 0 degrees,
  // looking straight at the panel = 90 degrees.
  vec3 N = normalize(panelNormalWorld);
  vec3 V = normalize(cameraWorldPosition - fragmentWorldPosition);
  float facing = clamp(abs(dot(N, V)), 0.0, 1.0);

  const vec3 GRAZING_PURPLE = vec3(0.30, 0.035, 0.52);
  const vec3 FACE_TURQUOISE = vec3(0.025, 0.72, 0.66);

  // Convert N dot V to the requested plane angle: 0 degrees at grazing and
  // 90 degrees face-on. The 45-90 range is expanded because the grayscale
  // mosaic rotates its instances between 45 and 0 degrees.
  const float HALF_PI = 1.57079632679;
  float planeAngle = asin(facing) / HALF_PI;
  float diffuseShade = smoothstep(0.5, 1.0, planeAngle);
  return mix(GRAZING_PURPLE, FACE_TURQUOISE, diffuseShade);
}
