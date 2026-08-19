import { useState, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function CameraController() {
  const { camera, gl } = useThree();
  const [targetFov, setTargetFov] = useState(camera.fov);

  const touchState = useRef({
    touchStartDist: 0,
    initialFov: camera.fov,
    currentTargetFov: camera.fov
  });

  useEffect(() => {
    touchState.current.currentTargetFov = targetFov;
  }, [targetFov]);

  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();
      const zoomSpeed = 0.05;
      setTargetFov((prev) => THREE.MathUtils.clamp(prev + e.deltaY * zoomSpeed, 5, 120));
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

        const zoomFactor = touchState.current.touchStartDist / dist;
        setTargetFov(THREE.MathUtils.clamp(touchState.current.initialFov * zoomFactor, 5, 120));
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
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
