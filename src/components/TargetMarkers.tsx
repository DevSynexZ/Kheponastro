"use client";

import React, { useMemo, useRef, useCallback, useEffect } from "react";
import * as THREE from "three";
import { Target, TargetType } from "@/lib/gameTypes";

interface TargetMarkersProps {
  scene: THREE.Scene;
  targets: Target[];
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  onTargetHover?: (target: Target | null) => void;
  onTargetClick?: (target: Target) => void;
}

const TARGET_COLORS: Record<TargetType, number> = {
  light: 0x10b981,    // emerald
  medium: 0x06b6d4,   // cyan
  heavy: 0xf59e0b,    // amber
  command: 0xef4444,  // red
  supply: 0x8b5cf6,   // violet,
};

const TARGET_EMISSIVE: Record<TargetType, number> = {
  light: 0x052e16,
  medium: 0x052e3d,
  heavy: 0x3d2e05,
  command: 0x3d0505,
  supply: 0x2e053d,
};

function getMeshMaterial(mesh: THREE.Mesh): THREE.MeshStandardMaterial {
  const mat = mesh.material;
  return Array.isArray(mat) ? mat[0] as THREE.MeshStandardMaterial : (mat as THREE.MeshStandardMaterial);
}

export default function TargetMarkers({
  scene,
  targets,
  camera,
  renderer,
  onTargetHover,
  onTargetClick,
}: TargetMarkersProps) {
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const hoverRef = useRef<Target | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);

  // Create or update target meshes
  useEffect(() => {
    const currentIds = new Set(targets.map((t) => t.id));
    const existingIds = new Set(meshesRef.current.keys());

    // Remove destroyed targets
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const mesh = meshesRef.current.get(id);
        if (mesh) {
          scene.remove(mesh);
          mesh.geometry.dispose();
          const mat = getMeshMaterial(mesh);
          mat.dispose();
        }
        meshesRef.current.delete(id);
      }
    }

    // Add/update targets
    for (const target of targets) {
      let mesh = meshesRef.current.get(target.id);

      if (!mesh) {
        // Create new target mesh
        const geometry = new THREE.CylinderGeometry(
          target.size,
          target.size * 1.2,
          target.size * 2,
          8,
          1,
          true
        );

        const material = new THREE.MeshStandardMaterial({
          color: TARGET_COLORS[target.type],
          emissive: TARGET_EMISSIVE[target.type],
          emissiveIntensity: 0.3,
          roughness: 0.6,
          metalness: 0.3,
          transparent: true,
          opacity: target.destroyed ? 0.3 : 1.0,
        });

        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.targetId = target.id;
        scene.add(mesh);
        meshesRef.current.set(target.id, mesh);
      }

      // Update position
      mesh.position.set(target.position.x, target.size, target.position.z);

      // Update visual state
      const material = getMeshMaterial(mesh);
      if (target.destroyed) {
        material.opacity = 0.3;
        material.emissiveIntensity = 0;
        mesh.scale.y = 0.2;
      } else if (target.hit) {
        material.emissiveIntensity = 1.0;
        material.emissive.setHex(0xffff00);
      } else {
        material.opacity = 1.0;
        material.emissiveIntensity = 0.3;
        material.emissive.setHex(TARGET_EMISSIVE[target.type]);
      }
    }
  }, [targets, scene]);

  // Raycast for hover/click - use native events
  const handlePointerMove = useCallback(
    (e: MouseEvent) => {
      const canvas = renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const targetMeshes = Array.from(meshesRef.current.values());
      const intersects = raycaster.intersectObjects(targetMeshes, false);

      if (intersects.length > 0) {
        const targetId = intersects[0].object.userData.targetId;
        const target = targets.find((t) => t.id === targetId) || null;
        if (target !== hoverRef.current) {
          hoverRef.current = target;
          onTargetHover?.(target);
        }
      } else if (hoverRef.current) {
        hoverRef.current = null;
        onTargetHover?.(null);
      }
    },
    [camera, renderer, targets, onTargetHover]
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const canvas = renderer.domElement;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const targetMeshes = Array.from(meshesRef.current.values());
      const intersects = raycaster.intersectObjects(targetMeshes, false);

      if (intersects.length > 0) {
        const targetId = intersects[0].object.userData.targetId;
        const target = targets.find((t) => t.id === targetId);
        if (target && !target.destroyed) {
          onTargetClick?.(target);
        }
      }
    },
    [camera, renderer, targets, onTargetClick]
  );

  // Attach events
  useEffect(() => {
    const canvas = renderer.domElement;
    canvas.addEventListener("mousemove", handlePointerMove);
    canvas.addEventListener("click", handleClick);
    return () => {
      canvas.removeEventListener("mousemove", handlePointerMove);
      canvas.removeEventListener("click", handleClick);
    };
  }, [handlePointerMove, handleClick, renderer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const mesh of meshesRef.current.values()) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        const mat = getMeshMaterial(mesh);
        mat.dispose();
      }
      meshesRef.current.clear();
    };
  }, [scene]);

  return null;
}