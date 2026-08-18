import React, { useMemo } from 'react';
import * as THREE from 'three';

export function Saturn({ position }) {
  // Generate procedural striped texture for Saturn
  const planetTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Draw horizontal stripes
    for (let y = 0; y < 256; y++) {
      const noise = Math.sin(y * 0.1) * Math.sin(y * 0.05) * 0.5 + 0.5;
      const r = Math.floor(200 + noise * 55);
      const g = Math.floor(180 + noise * 60);
      const b = Math.floor(140 + noise * 40);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, 512, 1);
    }

    return new THREE.CanvasTexture(canvas);
  }, []);

  // Generate procedural texture for rings
  const ringTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 2; // only need 1D gradient
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 512, 0);
    gradient.addColorStop(0.0, 'rgba(200, 180, 140, 0.0)');
    gradient.addColorStop(0.2, 'rgba(200, 180, 140, 0.8)');
    gradient.addColorStop(0.5, 'rgba(150, 130, 100, 0.4)');
    gradient.addColorStop(0.8, 'rgba(220, 200, 160, 0.9)');
    gradient.addColorStop(1.0, 'rgba(200, 180, 140, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 2);

    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <group position={position} rotation={[Math.PI * 0.1, 0, Math.PI * 0.15]}>
      {/* Planet */}
      <mesh>
        <sphereGeometry args={[12, 64, 64]} />
        <meshStandardMaterial map={planetTexture} roughness={0.7} />
      </mesh>

      {/* Rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[16, 28, 128]} />
        <meshStandardMaterial
          map={ringTexture}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}
