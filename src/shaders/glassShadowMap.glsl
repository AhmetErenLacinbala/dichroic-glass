vec4 glassShadowMap(
  vec3 panelNormalWorld,
  vec3 fragmentWorldPosition,
  vec3 pointLightPosition
) {
  // This function runs in the glass caster's shadow-map fragment pass.
  // RGB is transmitted-light color; alpha is shadow coverage.
  vec3 N = normalize(panelNormalWorld);
  vec3 L = normalize(pointLightPosition - fragmentWorldPosition);

  // |N.L| is a diffuse-style incidence term:
  // 0.0 = light ray lies in the glass plane (0 degrees)
  // 1.0 = light ray is perpendicular to the plane (90 degrees)
  float incidence = clamp(abs(dot(N, L)), 0.0, 1.0);

  const vec3 BLACK = vec3(0.0, 0.0, 0.0);
  const vec3 DARK_PURPLE = vec3(0.12, 0.0, 0.28);
  const vec3 LIGHT_BLUE = vec3(0.45, 0.78, 1.0);

  // Keep the exact zero-angle endpoint black, enter purple quickly, then
  // transition from purple to light blue as incidence approaches 90 degrees.
  float purpleEntry = smoothstep(0.0, 0.08, incidence);
  float blueProgress = smoothstep(0.35, 1.0, incidence);
  vec3 blackToPurple = mix(BLACK, DARK_PURPLE, purpleEntry);
  vec3 shadowColor = mix(blackToPurple, LIGHT_BLUE, blueProgress);

  // Grazing incidence blocks most light; face-on incidence transmits more.
  float shadowOpacity = mix(
    0.96,
    0.32,
    smoothstep(0.0, 1.0, incidence)
  );

  return vec4(shadowColor, shadowOpacity);
}
