import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { AnnotationObject } from "../lib/types";

interface AnnotationProps {
  annotation: AnnotationObject & { index?: number };
  scene: THREE.Scene;
  camera: THREE.Camera;
  controls?: any;
  activeAnnotationId: string | null;
  setActiveAnnotationId: (id: string | null) => void;
  onDelete?: (id: string) => void;
}

const Annotation: React.FC<AnnotationProps> = ({
  annotation,
  scene,
  camera,
  controls,
  activeAnnotationId,
  setActiveAnnotationId,
}) => {
  const spriteRef = useRef<THREE.Sprite | null>(null);
  const labelObjRef = useRef<CSS2DObject | null>(null);
  const lineRef = useRef<THREE.Line | null>(null);
  const [visible, setVisible] = useState(false);



  /** Create annotation sprite marker */
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const size = 140;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    
    // Draw circle background
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1f29";
    ctx.fill();
    
    // Draw annotation number
    ctx.font = "bold 48px sans-serif";
    ctx.fillStyle = "white";
    const text = annotation.index?.toString() ?? "";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, size / 2 - textWidth / 2, size / 2 + 18);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.fromArray(annotation.position);
    sprite.scale.setScalar(0.25);
    sprite.renderOrder = 999;
    sprite.visible = true;
    sprite.userData.annotationId = annotation.id;
    
    const handleClick = () => {
      setActiveAnnotationId(annotation.id);
      focusCamera(sprite.position.clone());
    };
    sprite.userData.onClick = handleClick;
    
    scene.add(sprite);
    spriteRef.current = sprite;

    return () => {
      scene.remove(sprite);
      texture.dispose();
      material.dispose();
    };
  }, [annotation.position, annotation.id, annotation.index, scene, setActiveAnnotationId]);

  useEffect(() => {
    const div = document.createElement("div");
    div.className = `
    text-white bg-black/80 rounded-md shadow-lg
    px-4 py-3 w-[200px]
    text-[12px] leading-[1.2]
    transition-opacity duration-300 ease-in-out
    border border-white/20
    relative
  `;

  // content
  div.textContent = annotation.text || 'No text';
  div.style.opacity = "0";


    const label = new CSS2DObject(div);
    label.position.fromArray(annotation.position);
    label.position.y -= 0.25;

    scene.add(label);
    labelObjRef.current = label;

    return () => {
      scene.remove(label);
    };
  }, [annotation.position, annotation.text, scene]);

  /** Connector line */
  useEffect(() => {
    const material = new THREE.LineBasicMaterial({
      color: 0x94adf3,
      transparent: true,
      opacity: 0,
      depthTest: false,
    });
    const points = [
      new THREE.Vector3(...annotation.position),
      new THREE.Vector3(annotation.position[0], annotation.position[1] - 0.25, annotation.position[2]),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 998;
    scene.add(line);
    lineRef.current = line;

    return () => {
      scene.remove(line);
      geometry.dispose();
      material.dispose();
    };
  }, [annotation.position, scene]);

  /** Update line and label visibility */
  useEffect(() => {
    const label = labelObjRef.current?.element as HTMLElement;
    const line = lineRef.current;

    if (!label || !line) return;

    if (visible) {
      label.style.opacity = "1";
      (line.material as THREE.LineBasicMaterial).opacity = 0.7;
    } else {
      label.style.opacity = "0";
      (line.material as THREE.LineBasicMaterial).opacity = 0;
    }
  }, [visible]);


  useEffect(() => {
    const update = () => {
      if (lineRef.current && spriteRef.current && labelObjRef.current) {
        const start = spriteRef.current.position.clone();
        const end = labelObjRef.current.position.clone();
        const pos = lineRef.current.geometry.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(0, start.x, start.y - 0.05, start.z);
        pos.setXYZ(1, end.x, end.y + 0.05, end.z);
        pos.needsUpdate = true;
      }
      requestAnimationFrame(update);
    };
    update();
  }, []);

  /** Focus camera on click */
  const focusCamera = (target: THREE.Vector3) => {
    if (!controls) return;
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const distance = 3;
    const endPos = target.clone().add(new THREE.Vector3(distance, distance * 0.8, distance));
    const duration = 1000;
    const start = performance.now();

    const animate = (t: number) => {
      const elapsed = Math.min((t - start) / duration, 1);
      const ease = 1 - Math.pow(1 - elapsed, 3);
      camera.position.lerpVectors(startPos, endPos, ease);
      controls.target.lerpVectors(startTarget, target, ease);
      controls.update();
      if (elapsed < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };


  useEffect(() => {
    const isActive = activeAnnotationId === annotation.id;
    setVisible(isActive);
    if (spriteRef.current) spriteRef.current.visible = true;
  }, [activeAnnotationId, annotation.id]);

  return null;
};

export default Annotation;