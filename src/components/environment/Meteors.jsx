import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Meteors() {
  const count = 20;
  const geometryRef = useRef();
  const materialRef = useRef();

  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 800,
          (Math.random() - 0.5) * 800,
          (Math.random() - 0.5) * 800
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
        color: new THREE.Color().setHSL(Math.random(), 1.0, 0.7),
        size: Math.random() > 0.9 ? 15.0 : 5.0, // 10% chance of being a large bolide
        life: Math.random() * 100
      });
    }
    return data;
  }, []);

  const { positions, colors, sizes } = useMemo(() => {
    return {
      positions: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      sizes: new Float32Array(count)
    };
  }, []);

  useFrame(() => {
    if (!geometryRef.current) return;

    for (let i = 0; i < count; i++) {
      let p = particles[i];
      p.life -= 1;

      if (p.life <= 0) {
        p.position.set(
          (Math.random() - 0.5) * 800,
          (Math.random() - 0.5) * 800,
          (Math.random() - 0.5) * 800
        );
        p.life = 50 + Math.random() * 100;
      } else {
        p.position.add(p.velocity);
      }

      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;

      sizes[i] = p.size * (p.life / 150.0); // fade out
    }

    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.attributes.color.needsUpdate = true;
    geometryRef.current.attributes.size.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexColors={true}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            // Create a soft glowing circle instead of a square
            vec2 uv = gl_PointCoord.xy - vec2(0.5);
            float dist = length(uv);
            if (dist > 0.5) discard;

            // Soft gradient
            float alpha = smoothstep(0.5, 0.1, dist) * 0.8;
            gl_FragColor = vec4(vColor, alpha);
          }
        `}
      />
    </points>
  );
}
