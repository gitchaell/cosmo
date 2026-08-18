import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
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
      // Multiply color values for extreme brightness/bloom
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
      // Enhanced sizes for better visibility
      sizes[i] = Math.max(4, 20 - star.apparent_mag * 3.0);
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
      <shaderMaterial ref={materialRef}
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
            gl_PointSize = size * (300.0 / -mvPosition.z);
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

            // Twinkling effect for smaller (distant) stars
            if (vSize < 10.0) {
              float twinkle = sin(uTime * 3.0 + gl_FragCoord.x * 0.1) * 0.5 + 0.5;

              // Shift color slightly between red, blue, and white
              float colorShift = sin(uTime * 1.5 + gl_FragCoord.y * 0.05);
              vec3 shiftColor;
              if (colorShift > 0.33) {
                shiftColor = vec3(1.0, 0.5, 0.5); // Reddish
              } else if (colorShift < -0.33) {
                shiftColor = vec3(0.5, 0.8, 1.0); // Light blue
              } else {
                shiftColor = vec3(1.0, 1.0, 1.0); // White
              }

              finalColor = mix(vColor, shiftColor, 0.4) * (0.5 + twinkle * 0.5);
            }

            gl_FragColor = vec4(finalColor, 1.0) * texColor;
          }
        `}
      />
    </points>
  );
}



function Meteors() {
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

function SunAndMoon() {

  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current) return;
    const state = useCosmosStore.getState();
    const time = state.time;
    // Simple rotation to simulate movement along the ecliptic
    const d = time.getTime() / 86400000.0 - 10957.5; // Days since J2000
    // Very simplified sun/moon position
    groupRef.current.rotation.y = d * 0.01;
  });

  return (
    <group ref={groupRef}>
      {/* Sun */}
      <mesh position={[400, 0, 0]}>
        <sphereGeometry args={[15, 32, 32]} />
        <meshBasicMaterial color="#ffffee" />
        <pointLight color="#ffffff" intensity={2} distance={1000} decay={2} />
      </mesh>

      {/* Moon */}
      <mesh position={[-380, 20, 50]}>
        <sphereGeometry args={[5, 32, 32]} />
        <meshStandardMaterial color="#888888" roughness={0.9} metalness={0.1} emissive="#111111" />
      </mesh>
    </group>
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

function Nebula() {
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

// Controller for custom FOV zooming while staying anchored at the origin
function CameraController() {
  const { camera, gl } = useThree();
  const [targetFov, setTargetFov] = useState(camera.fov);

  // Use refs to persist touch state across renders without triggering useEffect cleanup
  const touchState = useRef({
    touchStartDist: 0,
    initialFov: camera.fov,
    currentTargetFov: camera.fov // Also track the latest targetFov to use in start handler
  });

  // Keep ref in sync with state for handleTouchStart
  useEffect(() => {
    touchState.current.currentTargetFov = targetFov;
  }, [targetFov]);

  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();
      const zoomSpeed = 0.05;
      setTargetFov((prev) => THREE.MathUtils.clamp(prev + e.deltaY * zoomSpeed, 10, 100));
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchState.current.touchStartDist = Math.hypot(dx, dy);
        touchState.current.initialFov = touchState.current.currentTargetFov;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);

        // Inverse relationship: increase distance -> decrease fov (zoom in)
        const zoomFactor = touchState.current.touchStartDist / dist;
        setTargetFov(THREE.MathUtils.clamp(touchState.current.initialFov * zoomFactor, 10, 100));
      }
    };

    const canvas = gl.domElement;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gl.domElement]);

  useFrame(() => {
    // Lerp towards target FOV for smooth zooming
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1);
      camera.updateProjectionMatrix();
    }
  });

  return null;
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
        <SunAndMoon />
        <Meteors />

        {/* Simple grid to visualize equatorial plane */}
        <gridHelper args={[800, 36, 0x114455, 0x114455]} material-transparent material-opacity={0.0} rotation={[Math.PI/2, 0, 0]} visible={false} />
      </EquatorialGroup>

      {/* Postprocessing for glowing stars */}
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
