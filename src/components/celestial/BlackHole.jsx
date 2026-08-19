import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function BlackHole({ position }) {
  const accretionDiskRef = useRef();

  useFrame((state) => {
    if (accretionDiskRef.current) {
      accretionDiskRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group position={position}>
      {/* Event Horizon (Pure Black) */}
      <mesh>
        <sphereGeometry args={[10, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Accretion Disk */}
      <mesh ref={accretionDiskRef} rotation={[Math.PI / 2.5, 0, 0]}>
        <ringGeometry args={[12, 30, 64]} />
        <shaderMaterial
          transparent
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            void main() {
              // Radial gradient for the ring
              float dist = distance(vUv, vec2(0.5));
              // uvs for ring are 0 at inner edge, 1 at outer edge.
              // Center is at 0.5 in ringGeometry vUvs (actually y is radius, x is angle in standard ring geometry, wait let's check)
              // Actually standard ringGeometry uv mapping: x is angle, y is radius (0 inner, 1 outer).

              // Simple fade based on radius (y axis of UV)
              float alpha = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.6, vUv.y);

              // Color gradient: fiery orange to bright yellow to dark red
              vec3 innerColor = vec3(1.0, 0.8, 0.2); // Yellow/White
              vec3 outerColor = vec3(0.8, 0.2, 0.0); // Red
              vec3 finalColor = mix(innerColor, outerColor, vUv.y);

              gl_FragColor = vec4(finalColor, alpha * 0.8);
            }
          `}
        />
      </mesh>
    </group>
  );
}
