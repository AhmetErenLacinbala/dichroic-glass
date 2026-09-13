vec3 glassViewDiffuse(
  vec3 panelNormalWorld,
  vec3 fragmentWorldPosition,
  vec3 cameraWorldPosition
) {
  vec3 N = normalize(panelNormalWorld);
  vec3 V = normalize(cameraWorldPosition - fragmentWorldPosition);
  float facing = clamp(abs(dot(N, V)), 0.0, 1.0);

  const vec3 GRAZING_PURPLE = vec3(0.30, 0.035, 0.52);
  const vec3 FACE_TURQUOISE = vec3(0.025, 0.72, 0.66);

  const float HALF_PI = 1.57079632679;
  float planeAngle = asin(facing) / HALF_PI;
  float diffuseShade = smoothstep(0.5, 1.0, planeAngle);
  return mix(GRAZING_PURPLE, FACE_TURQUOISE, diffuseShade);
}
