import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const sunVertexShader = `
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

const sunFragmentShader = `
  uniform float uTime;
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

  // Fractional Brownian Motion
  float fbm(vec3 x) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 6; ++i) {
      v += a * cnoise(x);
      x = x * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Base 3D position mapped to sphere
    vec3 p = normalize(vPositionLocal) * 3.0;

    // Time-based turbulence
    float q = fbm(p - uTime * 0.1);

    vec3 p2 = p + vec3(1.0);
    float r = fbm(p2 + q + uTime * 0.15);

    float noise = fbm(p + r);

    // Normalize noise a bit
    noise = (noise + 1.0) * 0.5;

    // Color palette for sun (plasma)
    vec3 color1 = vec3(0.5, 0.0, 0.0);     // Dark red spots
    vec3 color2 = vec3(1.0, 0.3, 0.0);     // Deep orange
    vec3 color3 = vec3(1.0, 0.8, 0.1);     // Bright yellow
    vec3 color4 = vec3(1.0, 1.0, 0.9);     // Super hot white

    vec3 finalColor = mix(color1, color2, smoothstep(0.0, 0.4, noise));
    finalColor = mix(finalColor, color3, smoothstep(0.4, 0.7, noise));
    finalColor = mix(finalColor, color4, smoothstep(0.7, 1.0, noise));

    // Calculate rim lighting using view vector
    vec3 viewDir = normalize(-vPositionView);
    float rim = 1.0 - max(dot(viewDir, vNormalView), 0.0);
    // Multiply by bright orange for the limb darkening/brightening effect
    finalColor += vec3(1.0, 0.6, 0.1) * pow(rim, 2.0) * 1.2;

    // Increase overall intensity slightly for bloom
    gl_FragColor = vec4(finalColor * 1.5, 1.0);
  }
`;

const coronaVertexShader = `
  varying vec3 vNormalView;
  varying vec3 vPositionView;

  void main() {
    vPositionView = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * vec4(vPositionView, 1.0);
  }
`;

const coronaFragmentShader = `
  varying vec3 vNormalView;
  varying vec3 vPositionView;

  void main() {
    vec3 viewDir = normalize(-vPositionView);
    float intensity = pow(1.0 - max(dot(vNormalView, viewDir), 0.0), 3.0);

    // Bright glowing orange/yellow corona
    vec3 coronaColor = vec3(1.0, 0.6, 0.1);

    // Fade alpha based on intensity
    gl_FragColor = vec4(coronaColor * intensity * 2.0, intensity * 0.8);
  }
`;

export default function Sun({ position }) {
  const sunMaterialRef = useRef();

  useFrame((state) => {
    if (sunMaterialRef.current) {
      sunMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <group position={position}>
      {/* Sun Core with FBM plasma shader */}
      <mesh>
        <sphereGeometry args={[15, 64, 64]} />
        <shaderMaterial
          ref={sunMaterialRef}
          uniforms={{
            uTime: { value: 0 }
          }}
          vertexShader={sunVertexShader}
          fragmentShader={sunFragmentShader}
        />
        <pointLight color="#ffccaa" intensity={3.5} distance={2000} decay={1.5} />
      </mesh>

      {/* Sun Corona Glow - slightly larger sphere with fresnel blending */}
      <mesh>
        <sphereGeometry args={[17.5, 64, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={coronaVertexShader}
          fragmentShader={coronaFragmentShader}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Outer faint corona glow */}
      <mesh>
        <sphereGeometry args={[22, 64, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={coronaVertexShader}
          fragmentShader={`
            varying vec3 vNormalView;
            varying vec3 vPositionView;
            void main() {
              vec3 viewDir = normalize(-vPositionView);
              float intensity = pow(1.0 - max(dot(vNormalView, viewDir), 0.0), 5.0);
              gl_FragColor = vec4(vec3(1.0, 0.4, 0.0) * intensity * 1.5, intensity * 0.4);
            }
          `}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
