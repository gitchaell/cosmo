import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Meteors() {
  const count = 40; // Increased meteor count
  const trailLength = 15; // Number of trail segments per meteor
  const geometryRef = useRef();
  const materialRef = useRef();

  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const isBolide = Math.random() > 0.85; // 15% chance of being a bright fireball

      // Select atmospheric entry colors
      let baseColor;
      const colorRoll = Math.random();
      if (colorRoll > 0.7) baseColor = new THREE.Color(0.2, 1.0, 0.4); // Magnesium Green
      else if (colorRoll > 0.4) baseColor = new THREE.Color(1.0, 0.8, 0.2); // Iron Yellow
      else if (colorRoll > 0.2) baseColor = new THREE.Color(1.0, 0.4, 0.1); // Calcium Orange
      else baseColor = new THREE.Color(0.5, 0.5, 1.0); // Violet/Blue

      // Override bolide color to be blindingly white/cyan at the core
      if (isBolide) baseColor = new THREE.Color(0.8, 1.0, 1.0);

      data.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 1000,
          (Math.random() - 0.5) * 1000,
          (Math.random() - 0.5) * 1000
        ),
        // Fast velocities pointing generally inwards or across
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        ),
        color: baseColor,
        isBolide: isBolide,
        size: isBolide ? 40.0 : 12.0,
        life: Math.random() * 150,
        maxLife: 150,
        history: [] // Store previous positions for the trail
      });
    }
    return data;
  }, []);

  const totalPoints = count * trailLength;

  const { positions, colors, sizes } = useMemo(() => {
    return {
      positions: new Float32Array(totalPoints * 3),
      colors: new Float32Array(totalPoints * 3),
      sizes: new Float32Array(totalPoints)
    };
  }, [totalPoints]);

  useFrame(() => {
    if (!geometryRef.current) return;

    let pointIndex = 0;

    for (let i = 0; i < count; i++) {
      let p = particles[i];
      p.life -= 1;

      if (p.life <= 0) {
        // Respawn meteor
        p.position.set(
          (Math.random() - 0.5) * 1200,
          (Math.random() - 0.5) * 1200,
          (Math.random() - 0.5) * 1200
        );
        p.life = 50 + Math.random() * 100;
        p.maxLife = p.life;
        p.history = [];
      } else {
        // Record history before moving
        p.history.unshift(p.position.clone());
        if (p.history.length > trailLength) {
          p.history.pop();
        }
        p.position.add(p.velocity);
      }

      // Calculate overall fade based on life
      const lifeFade = Math.sin((p.life / p.maxLife) * Math.PI); // Fade in and out

      // Update head
      positions[pointIndex * 3] = p.position.x;
      positions[pointIndex * 3 + 1] = p.position.y;
      positions[pointIndex * 3 + 2] = p.position.z;

      colors[pointIndex * 3] = p.color.r;
      colors[pointIndex * 3 + 1] = p.color.g;
      colors[pointIndex * 3 + 2] = p.color.b;

      sizes[pointIndex] = p.size * lifeFade;
      pointIndex++;

      // Update trail
      for (let j = 1; j < trailLength; j++) {
        const histPos = p.history[j - 1] || p.position; // Fallback to current pos if history lacks

        positions[pointIndex * 3] = histPos.x;
        positions[pointIndex * 3 + 1] = histPos.y;
        positions[pointIndex * 3 + 2] = histPos.z;

        // Trail fades out in color and shifts towards red/orange (cooling off)
        const trailFade = 1.0 - (j / trailLength);

        if (p.isBolide) {
          colors[pointIndex * 3] = Math.min(1.0, p.color.r + (j * 0.1));
          colors[pointIndex * 3 + 1] = p.color.g * trailFade;
          colors[pointIndex * 3 + 2] = p.color.b * trailFade;
        } else {
          colors[pointIndex * 3] = p.color.r * trailFade;
          colors[pointIndex * 3 + 1] = p.color.g * trailFade;
          colors[pointIndex * 3 + 2] = p.color.b * trailFade;
        }

        sizes[pointIndex] = (p.size * 0.8) * trailFade * lifeFade;
        pointIndex++;
      }
    }

    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.attributes.color.needsUpdate = true;
    geometryRef.current.attributes.size.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" count={totalPoints} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={totalPoints} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={totalPoints} array={sizes} itemSize={1} />
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

            // Adjust size scaling based on FOV
            gl_PointSize = size * (800.0 / -mvPosition.z) * projectionMatrix[1][1];
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            vec2 uv = gl_PointCoord.xy - vec2(0.5);
            float dist = length(uv);

            // Hard discard outside circle
            if (dist > 0.5) discard;

            // Extremely bright core (sharp curve) + soft outer glow
            float core = pow(1.0 - (dist * 2.0), 3.0);
            float glow = smoothstep(0.5, 0.0, dist) * 0.5;

            float alpha = core + glow;

            gl_FragColor = vec4(vColor * (1.0 + core * 2.0), alpha);
          }
        `}
      />
    </points>
  );
}
