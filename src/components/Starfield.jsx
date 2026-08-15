import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import starsData from '../data/stars.json';
import useCosmosStore from '../store/useCosmosStore';

// Utility to convert RA/DEC to 3D Cartesian coordinates
function radecToCartesian(ra, dec, radius = 500) {
  const raRad = THREE.MathUtils.degToRad(ra);
  const decRad = THREE.MathUtils.degToRad(dec);

  // Note: Standard astronomical mapping:
  // Z axis points to RA = 0, Dec = 0
  // X axis points to RA = 90, Dec = 0
  // Y axis points to Dec = 90 (North Celestial Pole)
  const x = radius * Math.cos(decRad) * Math.sin(raRad);
  const y = radius * Math.sin(decRad);
  const z = radius * Math.cos(decRad) * Math.cos(raRad);

  return new THREE.Vector3(x, y, z);
}

function StarPoints() {
  const meshRef = useRef();
  const setFocusedStar = useCosmosStore(state => state.setFocusedStar);

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
      if (star.temp_k > 10000) colorObj.setHex(0xaaaaff); // Blue
      else if (star.temp_k > 7500) colorObj.setHex(0xcceeff); // White-blue
      else if (star.temp_k > 6000) colorObj.setHex(0xffffff); // White
      else if (star.temp_k > 5000) colorObj.setHex(0xffffcc); // Yellow-white
      else if (star.temp_k > 3500) colorObj.setHex(0xffcc99); // Orange
      else colorObj.setHex(0xff9999); // Red

      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;

      // Size based on magnitude (brighter = smaller magnitude = bigger size)
      // Enhanced sizes for better visibility
      sizes[i] = Math.max(3, 15 - star.apparent_mag * 2.5);
    });

    return { positions, colors, sizes };
  }, []);

  // Raycast interaction
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

  return (
    <points
      ref={meshRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
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
      <pointsMaterial
        vertexColors
        size={5}
        sizeAttenuation={false}
        transparent
        opacity={1.0}
      />
    </points>
  );
}

// Group representing the equatorial coordinate system.
// We rotate this based on time (LST) and location (Latitude).
function EquatorialGroup({ children }) {
  const groupRef = useRef();

  // Decoupled from React renders: read store value directly in useFrame
  useFrame(() => {
    if (!groupRef.current) return;

    const state = useCosmosStore.getState();
    const time = state.time;
    const lat = state.location.lat;
    const lon = state.location.lon;

    // Calculate Local Sidereal Time (simplified)
    const d = time.getTime() / 86400000.0 - 10957.5; // Days since J2000
    // LST in degrees
    const lst = (280.46061837 + 360.98564736629 * d + lon) % 360;

    // Convert to radians
    const lstRad = THREE.MathUtils.degToRad(lst);
    const latRad = THREE.MathUtils.degToRad(lat);

    // 1. Rotate around Y axis by -LST to simulate Earth's rotation
    groupRef.current.rotation.y = -lstRad;

    // 2. We need to incline the pole by the observer's latitude.
    // In our setup, Y is the Celestial North Pole.
    // To position it correctly relative to the observer's horizon (which we assume is XZ plane),
    // we tilt the entire system. Wait, if XZ is horizon and Y is Zenith:
    // Actually, in typical Three.js, it's easier to just let the user use OrbitControls.
    // If we want a fixed Horizon view:
    // Let's incline the equatorial plane so the North Celestial pole is at altitude = latitude.
    // We'll rotate around X axis by (90 - lat).
    groupRef.current.rotation.x = THREE.MathUtils.degToRad(90 - lat);
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
}

export default function Starfield() {
  return (
    <Canvas
      camera={{ position: [0, 0, 0.1], fov: 75 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
    >
      <color attach="background" args={['#051424']} />

      {/* Background procedural stars for depth */}
      <Stars radius={500} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <EquatorialGroup>
        <StarPoints />

        {/* Simple grid to visualize equatorial plane */}
        <gridHelper args={[800, 36, 0x22d3ee, 0x22d3ee]} material-transparent material-opacity={0.1} rotation={[Math.PI/2, 0, 0]} />
      </EquatorialGroup>

      {/* Allows the user to look around and navigate */}
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        minDistance={0.1}
        maxDistance={800}
        panSpeed={1.0}
        zoomSpeed={1.2}
      />
    </Canvas>
  );
}
