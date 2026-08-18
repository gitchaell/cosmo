import React, { useMemo } from 'react';
import * as THREE from 'three';

export default function Moon({ position }) {
  // Generate a procedural cratered texture for the moon
  const moonTextures = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base color
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, 512, 512);

    // Add noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for(let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 40;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Draw craters
    for(let i=0; i<100; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 20 + 2;

        // Inner shadow
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        // Outer rim highlight
        ctx.beginPath();
        ctx.arc(x-1, y-1, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return { map: texture, bumpMap: texture };
  }, []);

  return (
    <mesh position={position}>
      <sphereGeometry args={[5, 64, 64]} />
      <meshStandardMaterial
        map={moonTextures.map}
        bumpMap={moonTextures.bumpMap}
        bumpScale={0.1}
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}
