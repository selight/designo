import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { BufferGeometryLoader } from "three";
import type { ProjectData, PrimitiveKind, SceneObject, AnnotationObject } from "../lib/types";
import Annotation from "./Annotation";
import AnnotationInput from "./AnnotationInput";

type ViewportType = "perspective" | "top" | "front" | "right";

interface Props {
    project: ProjectData;
    selectedId: string | null;
    activeViewport: ViewportType;
    onAddPrimitive: (kind: PrimitiveKind) => void;
    onUploadSTL: (file: File) => void;
    onSelectObject: (id: string | null) => void;
    onDeleteObject: (id: string) => void;
    onResetCamera?: () => void;
     onPlaceAnnotation?: (
         worldPosition: [number, number, number],
         normal?: [number, number, number],
         text?: string,
         parentId?: string // 🟢 NEW — parent model ID
     ) => void;
    onUpdateObject?: (id: string, updates: Partial<SceneObject>) => void;
}

const ThreeViewport: React.FC<Props> = ({
    project,
    selectedId,
    activeViewport,
    onSelectObject,
    onDeleteObject,
    onResetCamera,
    onPlaceAnnotation,
    onUpdateObject
}) => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const css2dRendererRef = useRef<CSS2DRenderer | null>(null);
    const camerasRef = useRef<{ [K in ViewportType]: THREE.Camera } | null>(null);
    const currentCameraRef = useRef<THREE.Camera | null>(null);
    const orbitRef = useRef<OrbitControls | null>(null);
    const transformRef = useRef<TransformControls | null>(null);
    const idToObject3DRef = useRef<Map<string, THREE.Object3D>>(new Map());
    const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    
     // Annotation input state
     const [annotationInput, setAnnotationInput] = useState<{
         position: [number, number, number];
         normal?: [number, number, number];
         parentId?: string; // 🟢 NEW — parent model ID
     } | null>(null);

    // Initialize Three.js scene
    useEffect(() => {
        if (!mountRef.current) return;

        const container = mountRef.current;
        // Scene
        const scene = new THREE.Scene();

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d')!;
        
        // Create gradient background
        const gradient = context.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f0f23');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);
        
        const texture = new THREE.CanvasTexture(canvas);
        scene.background = texture;

        // Cameras
        const perspectiveCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        perspectiveCamera.position.set(8, 6, 8);

        const orthoSize = 8;
        const topCamera = new THREE.OrthographicCamera(-orthoSize, orthoSize, orthoSize, -orthoSize, 0.1, 1000);
        topCamera.position.set(0, 10, 0);
        topCamera.lookAt(0, 0, 0);

        const frontCamera = new THREE.OrthographicCamera(-orthoSize, orthoSize, orthoSize, -orthoSize, 0.1, 1000);
        frontCamera.position.set(0, 0, 10);
        frontCamera.lookAt(0, 0, 0);

        const rightCamera = new THREE.OrthographicCamera(-orthoSize, orthoSize, orthoSize, -orthoSize, 0.1, 1000);
        rightCamera.position.set(10, 0, 0);
        rightCamera.lookAt(0, 0, 0);

        const cameras = {
            perspective: perspectiveCamera,
            top: topCamera,
            front: frontCamera,
            right: rightCamera
        };

        const renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 1);
        

        
        container.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block";

        // CSS2D Renderer for annotations
        const css2dRenderer = new CSS2DRenderer();
        css2dRenderer.setSize(container.clientWidth, container.clientHeight);
        css2dRenderer.domElement.style.position = "absolute";
        css2dRenderer.domElement.style.top = "0px";
        css2dRenderer.domElement.style.pointerEvents = "none";
        css2dRenderer.domElement.style.zIndex = "1";
        container.appendChild(css2dRenderer.domElement);
        css2dRendererRef.current = css2dRenderer;

        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        scene.add(ambientLight);
        
        // Main directional light (key light)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        directionalLight.shadow.bias = -0.0001;
        scene.add(directionalLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-10, 5, -5);
        scene.add(fillLight);
        
        // Rim light
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
        rimLight.position.set(0, 5, -10);
        scene.add(rimLight);
        
        // Hemisphere light for softer ambient
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d1d, 0.3);
        scene.add(hemisphereLight);

        const gridSize = 20;
        const gridDivisions = 20;
        
        // Main grid
        const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0x444444);
        grid.material.opacity = 0.3;
        (grid.material as any).transparent = true;
        scene.add(grid);
  
        // Enhanced axes helper
        const axes = new THREE.AxesHelper(5);
        axes.material.linewidth = 2;
        scene.add(axes);
        
        
        // Controls
        const orbit = new OrbitControls(perspectiveCamera, renderer.domElement);
        orbit.enableDamping = true;
        orbit.dampingFactor = 0.05; // Smoother damping
        orbit.enablePan = true;
        orbit.enableZoom = true;
        orbit.enableRotate = true;
        orbit.autoRotate = false;
        orbit.minDistance = 0.5;
        orbit.maxDistance = 100;
        orbit.minPolarAngle = 0;
        orbit.maxPolarAngle = Math.PI;
        orbit.minAzimuthAngle = -Math.PI * 4; // Allow multiple full rotations
        orbit.maxAzimuthAngle = Math.PI * 4; // Allow multiple full rotations
        orbit.panSpeed = 1.0;
        orbit.zoomSpeed = 1.2;
        orbit.rotateSpeed = 1.0;
        orbit.target.set(0, 0, 0);
        orbit.enabled = true;

        const transform = new TransformControls(perspectiveCamera, renderer.domElement);
        transform.addEventListener("dragging-changed", (e: any) => {
            if (orbitRef.current) {
                orbitRef.current.enabled = !e.value;
            }
        });
        transform.setMode('translate');
        transform.enabled = true;
        transform.showX = true;
        transform.showY = true;
        transform.showZ = true;
        
        // Handle transform changes to update object data
        transform.addEventListener("objectChange", () => {
            if (selectedId && onUpdateObject) {
                const target = idToObject3DRef.current.get(selectedId);
                if (target && target.parent) {
                    try {
                        // Get current values and validate them
                        const position: [number, number, number] = [
                            isFinite(target.position.x) ? target.position.x : 0,
                            isFinite(target.position.y) ? target.position.y : 0,
                            isFinite(target.position.z) ? target.position.z : 0
                        ];
                        
                        const rotation: [number, number, number] = [
                            isFinite(target.rotation.x) ? target.rotation.x : 0,
                            isFinite(target.rotation.y) ? target.rotation.y : 0,
                            isFinite(target.rotation.z) ? target.rotation.z : 0
                        ];
                        
                        const scale: [number, number, number] = [
                            isFinite(target.scale.x) && target.scale.x > 0 ? target.scale.x : 1,
                            isFinite(target.scale.y) && target.scale.y > 0 ? target.scale.y : 1,
                            isFinite(target.scale.z) && target.scale.z > 0 ? target.scale.z : 1
                        ];
                        
                        // Only update if values are valid
                        if (position.every(v => isFinite(v)) && rotation.every(v => isFinite(v)) && scale.every(v => isFinite(v) && v > 0)) {
                            onUpdateObject(selectedId, { position, rotation, scale });
                        }
                    } catch (error) {
                        console.warn("Error updating object transform:", error);
                    }
                }
            }
        });

        // Resize handler
        const resize = () => {
            const rect = container.getBoundingClientRect();
            const width = Math.max(1, Math.floor(rect.width));
            const height = Math.max(1, Math.floor(rect.height));
            const aspect = width / height;

            renderer.setSize(width, height, true);
            css2dRenderer.setSize(width, height);

            // Update perspective camera
            perspectiveCamera.aspect = aspect;
            perspectiveCamera.updateProjectionMatrix();

            // Update orthographic cameras
            if (aspect > 1) {
                topCamera.left = -orthoSize * aspect;
                topCamera.right = orthoSize * aspect;
                topCamera.top = orthoSize;
                topCamera.bottom = -orthoSize;
                frontCamera.left = -orthoSize * aspect;
                frontCamera.right = orthoSize * aspect;
                frontCamera.top = orthoSize;
                frontCamera.bottom = -orthoSize;
                rightCamera.left = -orthoSize * aspect;
                rightCamera.right = orthoSize * aspect;
                rightCamera.top = orthoSize;
                rightCamera.bottom = -orthoSize;
            } else {
                topCamera.left = -orthoSize;
                topCamera.right = orthoSize;
                topCamera.top = orthoSize / aspect;
                topCamera.bottom = -orthoSize / aspect;
                frontCamera.left = -orthoSize;
                frontCamera.right = orthoSize;
                frontCamera.top = orthoSize / aspect;
                frontCamera.bottom = -orthoSize / aspect;
                rightCamera.left = -orthoSize;
                rightCamera.right = orthoSize;
                rightCamera.top = orthoSize / aspect;
                rightCamera.bottom = -orthoSize / aspect;
            }
            topCamera.updateProjectionMatrix();
            frontCamera.updateProjectionMatrix();
            rightCamera.updateProjectionMatrix();
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        window.addEventListener("resize", resize);
        resize();

        // Animation loop
        let running = true;
        const animate = () => {
            if (!running) return;
            try {
                // Always update orbit controls if they exist and are enabled
                if (orbitRef.current && orbitRef.current.enabled) {
                    orbitRef.current.update();
                }
                const camera = currentCameraRef.current || perspectiveCamera;
                renderer.render(scene, camera);
                if (css2dRenderer && css2dRenderer.domElement) {
                    css2dRenderer.render(scene, camera);
                }
            } catch (error) {
                console.warn("Error in animation loop:", error);
                running = false;
                return;
            }
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();

        // Store references
        sceneRef.current = scene;
        rendererRef.current = renderer;
        css2dRendererRef.current = css2dRenderer;
        camerasRef.current = cameras;
        currentCameraRef.current = perspectiveCamera;
        orbitRef.current = orbit;
        transformRef.current = transform;

        // Expose basic camera functions
        if (onResetCamera) {
            (window as any).resetCamera = () => {
                perspectiveCamera.position.set(8, 6, 8);
                orbit.target.set(0, 0, 0);
                orbit.update();
            };
            
            // Function to focus camera on a specific position
            (window as any).focusOnPosition = (position: [number, number, number]) => {
                const target = new THREE.Vector3().fromArray(position);
                
                // Smoothly animate to the target
                const startTarget = orbit.target.clone();
                const startPosition = perspectiveCamera.position.clone();
                
                // Calculate a good camera position relative to the annotation
                const distance = 2; // Closer distance for better focus
                const cameraPosition = target.clone().add(new THREE.Vector3(distance, distance * 0.5, distance));
                
                // Animate the camera movement
                const duration = 1000; // 1 second animation
                const startTime = Date.now();
                
                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Smooth easing function
                    const easeProgress = 1 - Math.pow(1 - progress, 3);
                    
                    // Interpolate target and position
                    orbit.target.lerpVectors(startTarget, target, easeProgress);
                    perspectiveCamera.position.lerpVectors(startPosition, cameraPosition, easeProgress);
                    orbit.update();
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    }
                };
                
                animate();
            };
        }

        return () => {
            running = false;
            
            // Cancel animation frame
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            
            // Disconnect observers and event listeners
            resizeObserver.disconnect();
            window.removeEventListener("resize", resize);
            
            // Dispose Three.js objects
            orbit.dispose();
            transform.dispose();
            renderer.dispose();
            
            // CSS2D renderer cleanup - it doesn't have a dispose method
            if (css2dRenderer && css2dRenderer.domElement) {
                try {
                    // Clear all CSS2D objects from the scene
                    scene.traverse((child) => {
                        if (child instanceof CSS2DObject) {
                            try {
                                if (child.parent === scene) {
                                    scene.remove(child);
                                }
                            } catch (error) {
                                console.warn("Error removing CSS2D object during cleanup:", error);
                            }
                        }
                    });
                    if (css2dRenderer.domElement.parentNode) {
                        css2dRenderer.domElement.parentNode.removeChild(css2dRenderer.domElement);
                    }
                } catch (error) {
                    console.warn("Error cleaning up CSS2D renderer DOM:", error);
                }
            }
            
            // Clear container completely - this is the safest approach
            if (container) {
                container.innerHTML = '';
            }
        };
    }, []);

    useEffect(() => {
        return () => {
            // Final cleanup when component unmounts
            const container = mountRef.current;
            if (container) {
                try {
                    container.innerHTML = '';
                } catch (error) {
                    console.warn("Error in final container cleanup:", error);
                }
            }
        };
    }, []);

    // Handle viewport changes
    useEffect(() => {
        if (!camerasRef.current || !orbitRef.current) return;

        const newCamera = camerasRef.current[activeViewport];
        if (newCamera) {
            currentCameraRef.current = newCamera;
            
            if (transformRef.current) {
                transformRef.current.camera = newCamera;
            }

            if (activeViewport === "perspective") {
                // Enable orbit controls for perspective view
                orbitRef.current.object = newCamera as THREE.PerspectiveCamera;
                orbitRef.current.enabled = true;
                orbitRef.current.update();
            } else {
                // Disable orbit controls for orthographic views
                orbitRef.current.enabled = false;
            }
        }
    }, [activeViewport]);

    // Build 3D object from scene data
    const buildObject3D = (obj: SceneObject): THREE.Object3D => {
        let mesh: THREE.Mesh;
        
        if (obj.type === "primitive") {
            // Enhanced materials like Three.js editor
            const material = new THREE.MeshPhysicalMaterial({ 
                color: 0x8ab4f8, 
                metalness: 0.0, 
                roughness: 0.4,
                clearcoat: 0.1,
                clearcoatRoughness: 0.1,
                envMapIntensity: 1.0
            });
            
            let geometry: THREE.BufferGeometry;
            if (obj.kind === "cube") {
                geometry = new THREE.BoxGeometry(1, 1, 1);
            } else if (obj.kind === "sphere") {
                geometry = new THREE.SphereGeometry(0.6, 64, 48); // Higher quality sphere
            } else {
                geometry = new THREE.ConeGeometry(0.6, 1, 32); // Higher quality cone
            }
            mesh = new THREE.Mesh(geometry, material);
        } else if (obj.type === "stl") {
            // Enhanced STL material
            const material = new THREE.MeshPhysicalMaterial({
                color: 0xb2ffc8,
                metalness: 0.1,
                roughness: 0.3,
                clearcoat: 0.2,
                clearcoatRoughness: 0.2,
                envMapIntensity: 1.0,
                opacity: 1.0,
                transparent: false
            });

            let geometry: THREE.BufferGeometry;
            try {
                if (obj.geometryJson && obj.geometryJson.data) {
                    geometry = new BufferGeometryLoader().parse(obj.geometryJson);

                    if (!geometry.getAttribute('position')) {
                        console.error("STL geometry missing position attribute");
                        geometry = new THREE.BoxGeometry(1, 1, 1);
                    }
                } else {
                    console.error("Invalid geometry JSON for STL object:", obj);
                    geometry = new THREE.BoxGeometry(1, 1, 1);
                }
            } catch (error) {
                console.error("Error parsing STL geometry:", error);
                geometry = new THREE.BoxGeometry(1, 1, 1);
            }
            mesh = new THREE.Mesh(geometry, material);
        } else if (obj.type === "annotation") {
            return new THREE.Group();
        } else {
            // Fallback
            mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        }

        mesh.name = obj.name;
        mesh.visible = obj.visible;
        
        // Validate and set position to prevent null/undefined values
        const safePosition = obj.position && obj.position.length === 3 && obj.position.every(v => isFinite(v)) 
            ? obj.position 
            : [0, 0, 0];
        mesh.position.fromArray(safePosition);
        
        // Validate and set rotation
        const safeRotation = obj.rotation && obj.rotation.length === 3 && obj.rotation.every(v => isFinite(v))
            ? obj.rotation
            : [0, 0, 0];
        mesh.rotation.set(safeRotation[0], safeRotation[1], safeRotation[2]);
        
        // Validate and set scale
        const safeScale = obj.scale && obj.scale.length === 3 && obj.scale.every(v => isFinite(v) && v > 0)
            ? obj.scale
            : [1, 1, 1];
        mesh.scale.fromArray(safeScale);
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    };

    // Rebuild scene objects when project changes
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene || !project) return;

        // Clear previous objects - simple and safe approach
        idToObject3DRef.current.forEach((obj) => {
            if (obj && obj.parent === scene) {
                scene.remove(obj);
            }
            // Dispose of geometry and materials
            if (obj instanceof THREE.Mesh) {
                obj.geometry?.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(mat => mat.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            }
        });
        idToObject3DRef.current.clear();

        // Add new objects (excluding annotations)
        for (const obj of project.objects) {
            if (obj.type === "annotation") {
                // Skip annotations - they're handled by React components
                continue;
            }
            const mesh = buildObject3D(obj);
            mesh.userData.__sceneObjectId = obj.id;
            scene.add(mesh);
            idToObject3DRef.current.set(obj.id, mesh);
            mesh.visible = true;
        }
    }, [project?.objects]);


    // Handle object selection
    useEffect(() => {
        const transform = transformRef.current;
        const orbit = orbitRef.current;
        if (!transform || !orbit) return;

        if (selectedId) {
            const target = idToObject3DRef.current.get(selectedId);
            if (target && target.parent) {
                // Ensure the object is still in the scene before attaching
                transform.attach(target);
            } else {
                // Object was removed, detach transform controls
                transform.detach();
                // Re-enable orbit controls
                if (activeViewport === "perspective") {
                    orbit.enabled = true;
                }
            }
        } else {
            transform.detach();
            // Re-enable orbit controls when nothing is selected
            if (activeViewport === "perspective") {
                orbit.enabled = true;
            }
        }
    }, [selectedId, project?.objects, activeViewport]);

    // Clean up transform controls when objects are removed
    useEffect(() => {
        const transform = transformRef.current;
        if (!transform || !selectedId) return;

        const target = idToObject3DRef.current.get(selectedId);
        if (!target || !target.parent) {
            // Object was removed, detach transform controls
            transform.detach();
        }
    }, [project?.objects, selectedId]);

    // Add click handler for object selection and double-click for annotations
    useEffect(() => {
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = currentCameraRef.current;
        if (!renderer || !scene || !camera) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let clickTimeout: number | null = null;

        const onMouseClick = (event: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            
            // Check for annotation sprites first - look for sprites in the scene
            const allSceneObjects: THREE.Object3D[] = [];
            scene.traverse((child) => {
                if (child instanceof THREE.Sprite) {
                    allSceneObjects.push(child);
                }
            });
            const annotationIntersects = raycaster.intersectObjects(allSceneObjects, true);
            
            if (annotationIntersects.length > 0) {
                // Clicked on an annotation sprite
                const clickedAnnotation = annotationIntersects[0].object;
                if (clickedAnnotation.userData.onClick) {
                    clickedAnnotation.userData.onClick();
                }
                return;
            }
            
            // Get all scene objects (excluding annotations for raycasting)
            const objects = Array.from(idToObject3DRef.current.values()).filter(obj => {
                const sceneObj = project.objects.find(o => o.id === obj.userData.__sceneObjectId);
                return sceneObj && sceneObj.type !== "annotation";
            });
            const intersects = raycaster.intersectObjects(objects, true);

            if (clickTimeout) {
                // Double click detected
                window.clearTimeout(clickTimeout);
                clickTimeout = null;
                
                 if (intersects.length > 0 && onPlaceAnnotation) {
                     const point = intersects[0].point;
                     const normal = intersects[0].face?.normal;
                     const worldPosition: [number, number, number] = [point.x, point.y, point.z];
                     const worldNormal: [number, number, number] | undefined = normal ? 
                         [normal.x, normal.y, normal.z] : undefined;
                     
                     // 🟢 Find the parent object ID
                     const clickedObject = intersects[0].object;
                     let rootObject: THREE.Object3D | null = clickedObject;
                     while (rootObject && !rootObject.userData.__sceneObjectId) {
                         rootObject = rootObject.parent;
                     }
                     const parentId = rootObject?.userData.__sceneObjectId;
                     
                     // Show annotation input with parent ID
                     setAnnotationInput({ position: worldPosition, normal: worldNormal, parentId });
                 }
            } else {
                // Single click - set timeout for potential double click
                clickTimeout = window.setTimeout(() => {
                    // Single click - normal selection mode
                    if (intersects.length > 0) {
                        const clickedObject = intersects[0].object;
                        // Find the root object (the one with __sceneObjectId)
                        let rootObject: THREE.Object3D | null = clickedObject;
                        while (rootObject && !rootObject.userData.__sceneObjectId) {
                            rootObject = rootObject.parent;
                        }
                        
                        if (rootObject && rootObject.userData.__sceneObjectId) {
                            const objectId = rootObject.userData.__sceneObjectId;
                            onSelectObject(objectId);
                            setActiveAnnotationId(null); // Clear active annotation when selecting other objects
                        }
                    } else {
                        // Clicked on empty space, deselect
                        onSelectObject(null);
                        setActiveAnnotationId(null); // Also clear active annotation
                    }
                    clickTimeout = null;
                }, 300); // 300ms delay to detect double click
            }
        };

        renderer.domElement.addEventListener('click', onMouseClick);
        
        return () => {
            renderer.domElement.removeEventListener('click', onMouseClick);
            if (clickTimeout) {
                window.clearTimeout(clickTimeout);
            }
        };
    }, [onSelectObject, onPlaceAnnotation, project.objects]);


     // Handle annotation input
     const handleAnnotationSave = (text: string) => {
         if (annotationInput && onPlaceAnnotation) {
             onPlaceAnnotation(annotationInput.position, annotationInput.normal, text, annotationInput.parentId);
         }
         setAnnotationInput(null);
     };

    const handleAnnotationCancel = () => {
        setAnnotationInput(null);
    };

    return (
        <div 
            ref={mountRef} 
            style={{ 
                width: "100%", 
                height: "100%", 
                position: "relative",
                background: "#0b1020"
            }} 
        >
             {/* Render annotations only if parent still exists */}
             {sceneRef.current && rendererRef.current && currentCameraRef.current &&
                 project.objects
                     .filter(
                         (o): o is AnnotationObject =>
                             o.type === "annotation" &&
                             (!o.targetObjectId ||
                                 project.objects.some((m) => m.id === o.targetObjectId)) // 🟢 skip if parent deleted
                     )
                     .map((obj, i) => (
                         <Annotation
                             key={obj.id}
                             annotation={{ ...obj, index: i + 1 }}
                             scene={sceneRef.current!}
                             camera={currentCameraRef.current!}
                             controls={orbitRef.current} // pass orbit controls
                             activeAnnotationId={activeAnnotationId}
                             setActiveAnnotationId={setActiveAnnotationId}
                             onDelete={onDeleteObject}
                         />
                     ))}

            {/* Render annotation input */}
            {annotationInput && (
                <AnnotationInput
                    position={annotationInput.position}
                    onSave={handleAnnotationSave}
                    onCancel={handleAnnotationCancel}
                />
            )}
        </div>
    );
};

export default ThreeViewport;