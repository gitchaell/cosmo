import React, { useRef } from 'react';
import * as THREE from 'three';

const moonVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vPositionView;
  varying vec3 vPositionLocal;

  void main() {
    vUv = uv;
    vPositionLocal = position;
    vPositionView = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * vec4(vPositionView, 1.0);
  }
`;

const moonFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vPositionView;
  varying vec3 vPositionLocal;

  // 3D Simplex Noise function
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

  float cnoise(vec3 P){
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;
    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);
    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  // Fractal noise for detailed surfaces
  float fbm(vec3 x) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 5; ++i) {
      v += a * cnoise(x);
      x = x * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  // Generate craters
  float crater(vec3 p, float radius, float depth) {
    float d = length(p);
    float cr = smoothstep(radius, radius * 0.8, d); // Floor
    float rim = smoothstep(radius * 1.2, radius, d) * smoothstep(radius * 0.5, radius, d); // Rim
    return -cr * depth + rim * depth * 0.5;
  }

  void main() {
    vec3 p = normalize(vPositionLocal);

    // Low frequency noise for Maria (dark patches)
    float mariaNoise = fbm(p * 2.5);
    float maria = smoothstep(0.0, 0.6, mariaNoise); // 0 in dark areas, 1 in highlands

    // High frequency noise for general surface bumpiness
    float microDetail = fbm(p * 20.0) * 0.1;

    // Base color mapped to maria vs highlands
    vec3 darkLunar = vec3(0.2, 0.2, 0.22);
    vec3 lightLunar = vec3(0.65, 0.65, 0.67);
    vec3 baseColor = mix(darkLunar, lightLunar, maria);

    // Add detail variations
    baseColor += microDetail;

    // Simulated bump map normal perturbation
    float dx = fbm(p * 15.0 + vec3(0.01, 0, 0)) - fbm(p * 15.0 - vec3(0.01, 0, 0));
    float dy = fbm(p * 15.0 + vec3(0, 0.01, 0)) - fbm(p * 15.0 - vec3(0, 0.01, 0));
    float dz = fbm(p * 15.0 + vec3(0, 0, 0.01)) - fbm(p * 15.0 - vec3(0, 0, 0.01));
    vec3 bumpNormal = normalize(vNormalView + vec3(dx, dy, dz) * 0.15);

    // Simple lighting model
    vec3 lightDir = normalize(vec3(1.0, 0.5, 0.2)); // Direction from sun

    // Diffuse lighting
    float diff = max(dot(bumpNormal, lightDir), 0.0);

    // Subtle ambient rim
    vec3 viewDir = normalize(-vPositionView);
    float rim = pow(1.0 - max(dot(viewDir, bumpNormal), 0.0), 4.0) * 0.2;

    vec3 finalColor = baseColor * diff * 1.5 + vec3(0.05) /* ambient */ + rim * vec3(0.8, 0.9, 1.0);

    // Hard shadow edge for realistic moon phases
    float terminator = smoothstep(-0.1, 0.1, dot(vNormalView, lightDir));
    finalColor *= terminator + 0.05; // 0.05 for slight ambient in shadowed side

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export default function Moon({ position }) {
  const moonMaterialRef = useRef();

  return (
    <mesh position={position} rotation={[0.2, 1.5, -0.1]}>
      <sphereGeometry args={[5, 128, 128]} />
      <shaderMaterial
        ref={moonMaterialRef}
        vertexShader={moonVertexShader}
        fragmentShader={moonFragmentShader}
      />
    </mesh>
  );
}
