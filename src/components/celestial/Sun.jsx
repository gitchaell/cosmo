import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Sun({ position }) {
  const sunMaterialRef = useRef();

  useFrame((state) => {
    if (sunMaterialRef.current) {
      sunMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <group position={position}>
      {/* Sun Core with procedural plasma shader */}
      <mesh>
        <sphereGeometry args={[15, 64, 64]} />
        <shaderMaterial
          ref={sunMaterialRef}
          uniforms={{
            uTime: { value: 0 }
          }}
          vertexShader={`
            varying vec2 vUv;
            varying vec3 vNormal;
            void main() {
              vUv = uv;
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float uTime;
            varying vec2 vUv;
            varying vec3 vNormal;

            // Simple noise function
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            void main() {
              // Animated "plasma" noise
              float noise = random(vUv * 10.0 + uTime * 0.1);
              float noise2 = random(vUv * 20.0 - uTime * 0.15);
              float mixedNoise = (noise + noise2) * 0.5;

              // Base yellow-orange to bright white
              vec3 color1 = vec3(1.0, 0.4, 0.0); // Orange
              vec3 color2 = vec3(1.0, 0.9, 0.5); // Yellow/White
              vec3 finalColor = mix(color1, color2, mixedNoise);

              gl_FragColor = vec4(finalColor, 1.0);
            }
          `}
        />
        <pointLight color="#ffffff" intensity={2.5} distance={1500} decay={2} />
      </mesh>

      {/* Sun Corona Glow */}
      <mesh>
        <sphereGeometry args={[18, 32, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
              gl_Position = projectionMatrix * vec4(vPosition, 1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
              float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
              gl_FragColor = vec4(1.0, 0.6, 0.2, 1.0) * intensity * 1.5;
            }
          `}
        />
      </mesh>
    </group>
  );
}
