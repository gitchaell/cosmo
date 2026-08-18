import React, { useMemo } from 'react';
import * as THREE from 'three';

export default function Nebula() {
  const nebulaTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const { positions, colors, sizes } = useMemo(() => {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colorObj = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Create a band-like structure for the Milky Way / Nebulas
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;

      // Concentrate near the equator (dec ~ 0) but add layered clumping
      const phi = Math.acos(2 * v - 1);

      // Multiple overlapping bands and clumps
      const bandOffset = (Math.random() - 0.5) * 0.5;
      const clump = Math.sin(theta * 5.0) * 0.2; // Add clumps along the band
      const layerOffset = Math.random() > 0.8 ? (Math.random() - 0.5) * 0.8 : 0; // Occasional wider spread

      const dec = Math.asin(Math.sin(phi) * (bandOffset + clump + layerOffset));

      const r = 450 + Math.random() * 50;

      positions[i * 3] = r * Math.cos(dec) * Math.sin(theta);
      positions[i * 3 + 1] = r * Math.sin(dec);
      positions[i * 3 + 2] = r * Math.cos(dec) * Math.cos(theta);

      // Deep purples, blues, and faint reds + new dusty and bright regions
      const colorChoice = Math.random();
      if (colorChoice > 0.9) colorObj.setRGB(0.8, 0.4, 0.2); // Dusty orange/brown
      else if (colorChoice > 0.8) colorObj.setRGB(0.1, 0.5, 0.8); // Bright blue (star forming)
      else if (colorChoice > 0.5) colorObj.setRGB(0.3, 0.1, 0.4); // Purple
      else colorObj.setRGB(0.15, 0.05, 0.2); // Dark Purple

      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;

      // Varying sizes for softer overlaps
      sizes[i] = Math.random() > 0.9 ? Math.random() * 150 + 80 : Math.random() * 80 + 40;
    }
    return { positions, colors, sizes };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={sizes.length} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={20}
        transparent
        opacity={0.05}
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        map={nebulaTexture}
        alphaTest={0.01}
      />
    </points>
  );
}
