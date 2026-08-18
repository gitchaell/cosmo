import React, { useMemo } from 'react';
import * as THREE from 'three';

export default function Nebula() {
  const nebulaTexture = useMemo(() => {
    // Generate a noise-based cloud texture to simulate volumetric dust
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Draw basic gradient core
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    // Add perlin-like noise manually to the alpha channel to make it look like a smoky cloud
    const imgData = ctx.getImageData(0, 0, 128, 128);
    const data = imgData.data;

    // Simple fractal noise generator
    function hash(x, y) {
      const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
      return h - Math.floor(h);
    }

    function noise(x, y) {
      const i = Math.floor(x), j = Math.floor(y);
      const f = x - i, g = y - j;
      const a = hash(i, j), b = hash(i + 1, j);
      const c = hash(i, j + 1), d = hash(i + 1, j + 1);
      const u = f * f * (3.0 - 2.0 * f), v = g * g * (3.0 - 2.0 * g);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }

    function fbm(x, y) {
      let v = 0.0, a = 0.5;
      for (let i = 0; i < 4; i++) {
        v += a * noise(x, y);
        x *= 2.0; y *= 2.0; a *= 0.5;
      }
      return v;
    }

    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const idx = (y * 128 + x) * 4;
        // distance from center
        const dx = x - 64;
        const dy = y - 64;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 64) {
          const n = fbm(x * 0.05, y * 0.05);
          // Modulate alpha with noise
          data[idx + 3] = Math.min(255, data[idx + 3] * (n * 1.5 + 0.2));
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    // Important for soft particles
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }, []);

  // Use a custom shader material for soft volumetric particles
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTexture: { value: nebulaTexture }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying vec2 vUv;
        void main() {
          vColor = color;
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (1000.0 / -mvPosition.z) * projectionMatrix[1][1];
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec3 vColor;

        void main() {
          vec4 texColor = texture2D(uTexture, gl_PointCoord);

          // Soft edge alpha
          float dist = distance(gl_PointCoord, vec2(0.5));
          float alpha = smoothstep(0.5, 0.0, dist) * texColor.a;

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(vColor, alpha * 0.15); // Adjust global opacity here
        }
      `
    });
  }, [nebulaTexture]);

  const { positions, colors, sizes } = useMemo(() => {
    const count = 6000; // Increased particle count for denser, smoother clouds
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colorObj = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Create a heavily clumped, twisted band for the Milky Way
      const u = Math.random();
      const theta = 2 * Math.PI * u;

      // Use noise/math to create organic clumps and arms
      const spiralOffset = Math.sin(theta * 3.0) * 0.3;
      const clumpNoise = Math.sin(theta * 12.0) * Math.cos(theta * 8.0);

      // Vertical spread (thickness of the galactic plane)
      let vSpread = (Math.random() - 0.5);
      // Square the spread to concentrate particles tightly at the very center (the galactic equator)
      vSpread = Math.sign(vSpread) * Math.pow(Math.abs(vSpread), 2.5);

      const phiOffset = (vSpread * 0.5) + (spiralOffset * 0.1);
      const dec = phiOffset;

      const r = 400 + Math.random() * 100 + (clumpNoise * 50);

      positions[i * 3] = r * Math.cos(dec) * Math.sin(theta);
      positions[i * 3 + 1] = r * Math.sin(dec);
      positions[i * 3 + 2] = r * Math.cos(dec) * Math.cos(theta);

      // Advanced color palette mapping for nebulae (Dusty reds, deep blues, glowing whites)
      const colorChoice = Math.random();

      // The core of the band is brighter and yellower/whiter, edges are blue/purple/red
      const isCore = Math.abs(vSpread) < 0.05;

      if (isCore) {
        // Bright core/dust lanes
        if (colorChoice > 0.6) colorObj.setRGB(1.0, 0.9, 0.7); // Bright dusty yellow/white
        else if (colorChoice > 0.3) colorObj.setRGB(0.8, 0.4, 0.1); // Dark dust orange
        else colorObj.setRGB(0.1, 0.1, 0.1); // Dark occlusion dust
      } else {
        // Outer halo and star forming regions
        if (colorChoice > 0.8) colorObj.setRGB(0.1, 0.4, 0.8); // Emission blue
        else if (colorChoice > 0.6) colorObj.setRGB(0.6, 0.1, 0.3); // Hydrogen Alpha red/pink
        else if (colorChoice > 0.3) colorObj.setRGB(0.2, 0.1, 0.4); // Deep space purple
        else colorObj.setRGB(0.05, 0.05, 0.1); // Very faint blue background
      }

      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;

      // Volumetric cloud sizes (massive overlap)
      sizes[i] = Math.random() > 0.8 ? Math.random() * 300 + 150 : Math.random() * 100 + 50;
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
      <primitive object={material} attach="material" />
    </points>
  );
}
