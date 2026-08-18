import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import useCosmosStore from '../store/useCosmosStore';

// Environment
import StarPoints from './environment/StarPoints';
import Nebula from './environment/Nebula';
import Meteors from './environment/Meteors';

// Celestial Bodies
import Sun from './celestial/Sun';
import Moon from './celestial/Moon';
import BlackHole from './celestial/BlackHole';
import { Saturn } from './celestial/Planets';

// Controls
import CameraController from './controls/CameraController';

// Group representing the equatorial coordinate system.
// We rotate this based on time (LST) and location (Latitude).
function EquatorialGroup({ children }) {
  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current) return;

    const state = useCosmosStore.getState();
    const time = state.time;
    const lat = state.location.lat;
    const lon = state.location.lon;

    const d = time.getTime() / 86400000.0 - 10957.5; // Days since J2000
    const lst = (280.46061837 + 360.98564736629 * d + lon) % 360;

    const lstRad = THREE.MathUtils.degToRad(lst);
    const latRad = THREE.MathUtils.degToRad(lat);

    groupRef.current.rotation.y = -lstRad;
    groupRef.current.rotation.x = THREE.MathUtils.degToRad(90 - lat);
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
}

// Celestial Simulation that handles orbits
function CelestialSimulation() {
  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current) return;
    const state = useCosmosStore.getState();
    const time = state.time;
    const d = time.getTime() / 86400000.0 - 10957.5;
    // Very simplified planetary motion
    groupRef.current.rotation.y = d * 0.005;
  });

  return (
    <group ref={groupRef}>
      <Sun position={[400, 0, 0]} />
      <Moon position={[-380, 20, 50]} />
      <BlackHole position={[200, 150, -300]} />
      <Saturn position={[-100, -50, 350]} />
    </group>
  );
}

export default function Starfield() {
  return (
    <Canvas
      camera={{ position: [0, 0, 0.1], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%', pointerEvents: 'auto', touchAction: 'none' }}
    >
      <color attach="background" args={['#000000']} />

      <CameraController />

      {/* Background procedural stars for depth */}
      <Stars radius={500} depth={50} count={8000} factor={6} saturation={0.5} fade speed={1} />

      <EquatorialGroup>
        <StarPoints />
        <Nebula />
        <Meteors />
        <CelestialSimulation />
      </EquatorialGroup>

      {/* Postprocessing for glowing stars and bodies */}
      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={1} mipmapBlur luminanceSmoothing={0.5} intensity={1.5} />
      </EffectComposer>

      {/* Allows the user to look around and navigate */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={0.1}
        maxDistance={800}
        rotateSpeed={-0.5}
      />
    </Canvas>
  );
}
