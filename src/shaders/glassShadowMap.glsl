vec4 glassShadowMap(
  vec3 panelNormalWorld,
  vec3 fragmentWorldPosition,
  vec3 pointLightPosition
) {
  vec3 N = normalize(panelNormalWorld);
  vec3 L = normalize(pointLightPosition - fragmentWorldPosition);

  float incidence = clamp(abs(dot(N, L)), 0.0, 1.0);

  const vec3 BLACK = vec3(0.0, 0.0, 0.0);
  const vec3 DARK_PURPLE = vec3(0.12, 0.0, 0.28);
  const vec3 LIGHT_BLUE = vec3(0.45, 0.78, 1.0);

  float purpleEntry = smoothstep(0.0, 0.08, incidence);
  float blueProgress = smoothstep(0.35, 1.0, incidence);
  vec3 blackToPurple = mix(BLACK, DARK_PURPLE, purpleEntry);
  vec3 shadowColor = mix(blackToPurple, LIGHT_BLUE, blueProgress);

  float shadowOpacity = mix(
    0.96,
    0.32,
    smoothstep(0.0, 1.0, incidence)
  );

  return vec4(shadowColor, shadowOpacity);
}
