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
                                                   onDelete
                                               }) => {
    const labelRef = useRef<HTMLDivElement>(null);
    const labelObjRef = useRef<CSS2DObject | null>(null);
    const spriteRef = useRef<THREE.Sprite | null>(null);
    const lineRef = useRef<THREE.Line | null>(null);
    const [visible, setVisible] = useState(false); // Initially hide labels and lines

    /** Sprite marker **/
    useEffect(() => {
        const canvas = document.createElement("canvas");
        const size = 128;
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2.8, 0, Math.PI * 2);
        ctx.fillStyle = "#00bcd4";
        ctx.fill();
        ctx.font = "bold 48px sans-serif";
        ctx.fillStyle = "white";
        const text = annotation.index?.toString() ?? "";
        const tw = ctx.measureText(text).width;
        ctx.fillText(text, size / 2 - tw / 2, size / 2 + 18);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            sizeAttenuation: true
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.fromArray(annotation.position);
        sprite.renderOrder = 999;
        sprite.scale.setScalar(0.08);
        sprite.visible = true;
        scene.add(sprite);
        spriteRef.current = sprite;

        return () => {
            // Simple cleanup - just remove from scene and dispose
            if (sprite && sprite.parent === scene) {
                scene.remove(sprite);
            }
            texture.dispose();
            material.dispose();
        };
    }, [annotation.position, scene, annotation.index]);

    /** Label below marker **/
    useEffect(() => {
        if (!labelRef.current) return undefined;
        const div = labelRef.current;
        
        // Clone the div to prevent React from managing it
        const clonedDiv = div.cloneNode(true) as HTMLElement;
        const label = new CSS2DObject(clonedDiv);
        const labelPos = new THREE.Vector3(...annotation.position);
        labelPos.y -= 0.25;
        label.position.copy(labelPos);
        scene.add(label);
        labelObjRef.current = label;
        
        return () => {
            // Simple cleanup - just remove from scene
            if (label && label.parent === scene) {
                scene.remove(label);
            }
        };
    }, [annotation.position, scene]);

    /** Connector line **/
    useEffect(() => {
        const mat = new THREE.LineBasicMaterial({
            color: 0x00bcd4,
            transparent: true,
            opacity: visible ? 0.7 : 0,
            depthTest: false
        });
        const pts = [
            new THREE.Vector3(...annotation.position),
            new THREE.Vector3(annotation.position[0], annotation.position[1] - 0.25, annotation.position[2])
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geo, mat);
        line.renderOrder = 998;
        scene.add(line);
        lineRef.current = line;

        return () => {
            // Simple cleanup - remove from scene and dispose
            if (line && line.parent === scene) {
                scene.remove(line);
            }
            geo.dispose();
            mat.dispose();
        };
    }, [annotation.position, scene, visible]);

    /** Update line each frame **/
    useEffect(() => {
        const update = () => {
            if (lineRef.current && spriteRef.current && labelObjRef.current) {
                const start = spriteRef.current.position.clone();
                const end = labelObjRef.current.position.clone();
                const pos = lineRef.current.geometry.attributes.position as THREE.BufferAttribute;
                pos.setXYZ(0, start.x, start.y - 0.05, start.z);
                pos.setXYZ(1, end.x, end.y + 0.05, end.z);
                pos.needsUpdate = true;

                // sync line opacity with label
                (lineRef.current.material as THREE.LineBasicMaterial).opacity = visible ? 0.7 : 0;
            }
            requestAnimationFrame(update);
        };
        update();
    }, [visible]);

    /** Scale marker with camera distance **/
    useEffect(() => {
        const updateScale = () => {
            if (!spriteRef.current) return;
            const d = camera.position.distanceTo(spriteRef.current.position);
            spriteRef.current.scale.setScalar(d * 0.015);
            requestAnimationFrame(updateScale);
        };
        updateScale();
    }, [camera]);

    /** Focus camera with zoom + orbit **/
    const focusCamera = (target: THREE.Vector3) => {
        const startPos = camera.position.clone();
        const startQuat = camera.quaternion.clone();

        const direction = new THREE.Vector3().subVectors(target, startPos).normalize();
        const distance = startPos.distanceTo(target);
        const closer = distance * 0.5;
        const endPos = target.clone().add(direction.multiplyScalar(-closer)).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);

        camera.lookAt(target);
        const endQuat = camera.quaternion.clone();
        camera.position.copy(startPos);
        camera.quaternion.copy(startQuat);

        const duration = 1300;
        const start = performance.now();

        const animate = (t: number) => {
            const elapsed = Math.min((t - start) / duration, 1);
            const ease = 1 - Math.pow(1 - elapsed, 3);
            camera.position.lerpVectors(startPos, endPos, ease);
            camera.quaternion.slerp(endQuat, ease);
            camera.lookAt(target);

            if (controls) {
                controls.target.lerp(target, ease * 0.9);
                controls.update();
            }

            if (elapsed < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    };

    /** Set up sprite click handler **/
    useEffect(() => {
        if (!spriteRef.current) return;
        
        // Store click handler in sprite userData for ThreeViewport to use
        spriteRef.current.userData.onClick = () => {
            setActiveAnnotationId(annotation.id);
            focusCamera(spriteRef.current!.position.clone());
        };
        
        return () => {
            if (spriteRef.current) {
                delete spriteRef.current.userData.onClick;
            }
        };
    }, [annotation.id]);

    /** Fade label & line based on active **/
    useEffect(() => {
        // Hide label & line only, keep marker visible
        const isActive = activeAnnotationId === annotation.id;
        setVisible(activeAnnotationId === null || isActive);
        if (spriteRef.current) spriteRef.current.visible = true;
      }, [activeAnnotationId]);


      

    return (
        <div
            ref={labelRef}
            style={{
                background: "rgba(0, 0, 0, 0.75)",
                color: "#fff",
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                minWidth: "140px",
                textAlign: "center",
                pointerEvents: visible ? "auto" : "none",
                opacity: visible ? 1 : 0,
                transition: "opacity 0.15s ease",
                whiteSpace: "nowrap",
                position: "absolute",
                top: "-9999px",
                left: "-9999px",
                zIndex: -1
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                onDelete?.(annotation.id);
            }}
        >
            {annotation.text}
        </div>
    );
};

export default Annotation;