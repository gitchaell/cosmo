import { useState, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function CameraController() {
  const { camera, gl, controls } = useThree();

  const targetPosition = useRef(new THREE.Vector3().copy(camera.position));

  const touchState = useRef({
    touchStartDist: 0,
    initialTargetPos: new THREE.Vector3()
  });

  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();

      const zoomSpeed = 0.5;
      const zoomAmount = e.deltaY * zoomSpeed;

      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);

      // We move opposite to the direction if deltaY is positive (zoom out),
      // and along the direction if deltaY is negative (zoom in).
      const movement = direction.clone().multiplyScalar(-zoomAmount);
      targetPosition.current.add(movement);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchState.current.touchStartDist = Math.hypot(dx, dy);
        touchState.current.initialTargetPos.copy(targetPosition.current);
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);

        // If dist > touchStartDist, we are pinching out (zooming in) -> negative zoomAmount
        // If dist < touchStartDist, we are pinching in (zooming out) -> positive zoomAmount
        const zoomFactor = touchState.current.touchStartDist / dist;
        // Simple zoom amount based on factor. When factor > 1 (zoom out), amount is positive.
        // When factor < 1 (zoom in), amount is negative.
        // We'll scale this for reasonable speed.
        const zoomAmount = (zoomFactor - 1.0) * 100.0;

        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        const movement = direction.clone().multiplyScalar(-zoomAmount);

        targetPosition.current.copy(touchState.current.initialTargetPos).add(movement);
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
  }, [camera, gl.domElement]);

  useFrame(() => {
    // Interpolate camera position towards target position
    camera.position.lerp(targetPosition.current, 0.1);

    // If OrbitControls is used, its target needs to be translated as well
    // so that panning/looking around continues from the new position
    if (controls) {
      // The distance vector from camera to the controls target
      const offset = controls.target.clone().sub(camera.position);
      // We need to keep this offset length, or adjust the target to move along with the camera
      // The easiest way is to let the camera move and we update controls.target to be in front of the camera
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      const distance = camera.position.distanceTo(controls.target);
      controls.target.copy(camera.position).add(direction.multiplyScalar(Math.max(distance, 1)));
      controls.update();
    }
  });

  return null;
}
