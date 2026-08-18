import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import starsData from '../../data/stars.json';
import useCosmosStore from '../../store/useCosmosStore';

// Utility to convert RA/DEC to 3D Cartesian coordinates
function radecToCartesian(ra, dec, radius = 500) {
  const raRad = THREE.MathUtils.degToRad(ra);
  const decRad = THREE.MathUtils.degToRad(dec);

  const x = radius * Math.cos(decRad) * Math.sin(raRad);
  const y = radius * Math.sin(decRad);
  const z = radius * Math.cos(decRad) * Math.cos(raRad);

  return new THREE.Vector3(x, y, z);
}

export default function StarPoints() {
  const meshRef = useRef();
  const setFocusedStar = useCosmosStore(state => state.setFocusedStar);
  const { raycaster } = useThree();
  const materialRef = useRef();

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  useEffect(() => {
    raycaster.params.Points.threshold = 5.0;
  }, [raycaster]);

  const starTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Draw diffraction spikes (twinkle effect)
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(32, 64);
    ctx.moveTo(0, 32);
    ctx.lineTo(64, 32);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw sharper core
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.05, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }, []);

  // Create geometry and materials for data-driven stars
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(starsData.length * 3);
    const colors = new Float32Array(starsData.length * 3);
    const sizes = new Float32Array(starsData.length);

    const colorObj = new THREE.Color();

    starsData.forEach((star, i) => {
      const pos = radecToCartesian(star.ra, star.dec, 400); // inner sphere for interactable stars
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      // Determine color from temperature (simplified approximation)
      const bloomFactor = Math.max(1.0, (10 - star.apparent_mag) * 0.5);

      if (star.temp_k > 10000) colorObj.setRGB(0.6 * bloomFactor, 0.6 * bloomFactor, 1.0 * bloomFactor); // Blue
      else if (star.temp_k > 7500) colorObj.setRGB(0.8 * bloomFactor, 0.9 * bloomFactor, 1.0 * bloomFactor); // White-blue
      else if (star.temp_k > 6000) colorObj.setRGB(1.0 * bloomFactor, 1.0 * bloomFactor, 1.0 * bloomFactor); // White
      else if (star.temp_k > 5000) colorObj.setRGB(1.0 * bloomFactor, 1.0 * bloomFactor, 0.8 * bloomFactor); // Yellow-white
      else if (star.temp_k > 3500) colorObj.setRGB(1.0 * bloomFactor, 0.8 * bloomFactor, 0.6 * bloomFactor); // Orange
      else colorObj.setRGB(1.0 * bloomFactor, 0.6 * bloomFactor, 0.6 * bloomFactor); // Red

      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;

      // Size based on magnitude (brighter = smaller magnitude = bigger size)
      sizes[i] = Math.max(4, 20 - star.apparent_mag * 3.0);
    });

    return { positions, colors, sizes };
  }, []);

  const [hovered, setHovered] = useState(null);

  const handlePointerOver = (e) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    if (e.index !== undefined) {
      setHovered(e.index);
    }
  };

  const handlePointerOut = (e) => {
    document.body.style.cursor = 'auto';
    setHovered(null);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.index !== undefined) {
      setFocusedStar(starsData[e.index]);
    } else {
      setFocusedStar(null);
    }
  };

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.geometry.computeBoundingSphere();
      // Ensure bounding sphere is large enough so it doesn't get culled prematurely
      meshRef.current.geometry.boundingSphere.radius = 1000;
    }
  }, [positions]);

  return (
    <points
      ref={meshRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      frustumCulled={false}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial ref={materialRef}
        vertexColors={true}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uTexture: { value: starTexture }
        }}
        vertexShader={`
          attribute float size;
          varying vec3 vColor;
          varying vec2 vUv;
          varying float vSize;
          void main() {
            vColor = color;
            vSize = size;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

            // Fix star size disappearance on zoom by incorporating FOV factor
            // projectionMatrix[1][1] is essentially 1 / tan(fov/2)
            gl_PointSize = size * (1000.0 / -mvPosition.z) * projectionMatrix[1][1];

            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform sampler2D uTexture;
          varying vec3 vColor;
          varying float vSize;

          void main() {
            vec4 texColor = texture2D(uTexture, gl_PointCoord);
            if (texColor.a < 0.01) discard;

            vec3 finalColor = vColor;

            // Twinkling effect based on apparent size/magnitude
            // Brighter/closer stars (larger size) twinkle less, faint stars twinkle rapidly
            float twinkleSpeed = mix(6.0, 1.0, smoothstep(4.0, 20.0, vSize));
            float twinkleIntensity = mix(0.9, 0.1, smoothstep(4.0, 20.0, vSize));

            // Generate a pseudo-random phase for this star
            float phase = (gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233);

            // Combine multiple sine waves for a chaotic twinkle
            float twinkle = sin(uTime * twinkleSpeed + phase) * 0.5 + 0.5;
            twinkle *= sin(uTime * twinkleSpeed * 0.73 + phase * 1.3) * 0.5 + 0.5;

            // Chromatic aberration / Atmospheric scattering on twinkling
            // Colors shift violently for heavily twinkling stars
            vec3 shiftColor = vColor;
            float hueShift = sin(uTime * twinkleSpeed * 1.5 + phase * 2.0);
            if (twinkleIntensity > 0.5) {
                if (hueShift > 0.5) shiftColor = vec3(1.0, 0.3, 0.3);       // Red flash
                else if (hueShift < -0.5) shiftColor = vec3(0.3, 0.5, 1.0); // Blue flash
                else shiftColor = vec3(1.0, 1.0, 1.0);                      // Brilliant white flash

                // Mix the chromatic shift based on how dim the twinkle currently is (atmospheric refraction happens when it dims)
                finalColor = mix(vColor, shiftColor, (1.0 - twinkle) * 0.8);
            }

            // Apply intensity modulation
            float finalIntensity = 1.0 - (twinkle * twinkleIntensity);
            finalColor *= finalIntensity;

            gl_FragColor = vec4(finalColor, 1.0) * texColor;
          }
        `}
      />
    </points>
  );
}
