import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

interface CharacterDefinition {
    id: string;
    path: string;
    positionX: number;
}

interface LoadedCharacter extends CharacterDefinition {
    model?: THREE.Group;
}

const CHARACTER_DEFINITIONS: CharacterDefinition[] = [
    { id: "man", path: "/models/man.glb", positionX: -1.5 },
    { id: "robot", path: "/models/woman.glb", positionX: 1.5 },
];

const App: React.FC = () => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const raycasterRef = useRef<THREE.Raycaster | null>(null);
    const mouseRef = useRef(new THREE.Vector2());
    const hoveredRootRef = useRef<THREE.Object3D | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const charactersRef = useRef<LoadedCharacter[]>(
        CHARACTER_DEFINITIONS.map((c) => ({ ...c }))
    );

    const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

    // Init Three.js (once)
    useEffect(() => {
        if (!mountRef.current) return;

        const container = mountRef.current;

        // Scene & Camera
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 1.5, 5);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        container.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.enableDamping = true;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 5, 5);
        scene.add(ambientLight, dirLight);

        // Loader with Meshopt support
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);

        // Load characters
        charactersRef.current.forEach((char) => {
            loader.load(
                char.path,
                (gltf: any) => {
                    const model = gltf.scene;
                    model.position.set(char.positionX, 0, 0);
                    model.scale.set(1.2, 1.2, 1.2);
                    model.traverse((obj: THREE.Object3D) => {
                        obj.userData.__rootId = char.id; // tag for root association
                    });
                    scene.add(model);
                    char.model = model;
                },
                undefined,
                (err: unknown) => console.error(err)
            );
        });

        // Raycaster
        const raycaster = new THREE.Raycaster();

        // Responsive sizing based on container
        const resizeToContainer = () => {
            const width = container.clientWidth || window.innerWidth;
            const height = container.clientHeight || window.innerHeight;
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };
        resizeToContainer();

        const ro = new ResizeObserver(() => resizeToContainer());
        ro.observe(container);

        // Events on canvas
        const onPointerMove = (event: PointerEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            mouseRef.current.x = x * 2 - 1;
            mouseRef.current.y = -(y * 2 - 1);
        };

        const findRootModel = (obj: THREE.Object3D | null): THREE.Object3D | null => {
            if (!obj) return null;
            // go up until we find the loaded group (tagged) or reach scene
            let current: THREE.Object3D | null = obj;
            while (current && current.parent) {
                if (current.userData && current.userData.__rootId) return current;
                current = current.parent;
            }
            return null;
        };

        const onClick = () => {
            const cameraForCast = camera;
            const models = charactersRef.current
                .map((c) => c.model)
                .filter(Boolean) as THREE.Object3D[];
            raycaster.setFromCamera(mouseRef.current, cameraForCast);
            const intersects = raycaster.intersectObjects(models, true);
            if (intersects.length > 0) {
                const root = findRootModel(intersects[0].object);
                if (!root) return;
                const id = (root.userData && root.userData.__rootId) as string | undefined;
                if (id) setSelectedCharacter(id);
            }
        };

        renderer.domElement.addEventListener("pointermove", onPointerMove, { passive: true });
        renderer.domElement.addEventListener("click", onClick);

        // Animation loop
        const animate = () => {
            controls.update();

            // Hover detection
            const models = charactersRef.current
                .map((c) => c.model)
                .filter(Boolean) as THREE.Object3D[];
            raycaster.setFromCamera(mouseRef.current, camera);
            const intersects = raycaster.intersectObjects(models, true);
            hoveredRootRef.current = intersects.length
                ? findRootModel(intersects[0].object)
                : null;

            // Apply visual states
            models.forEach((m) => {
                const id = (m.userData && m.userData.__rootId) as string | undefined;
                if (!id) return;
                if (selectedCharacter === id) {
                    m.scale.set(1.5, 1.5, 1.5);
                } else if (hoveredRootRef.current === m) {
                    m.scale.set(1.35, 1.35, 1.35);
                } else {
                    m.scale.set(1.2, 1.2, 1.2);
                }
            });

            renderer.render(scene, camera);
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animationFrameRef.current = requestAnimationFrame(animate);

        // Store refs
        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;
        controlsRef.current = controls;
        raycasterRef.current = raycaster;
        resizeObserverRef.current = ro;

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            renderer.domElement.removeEventListener("pointermove", onPointerMove);
            renderer.domElement.removeEventListener("click", onClick);
            ro.disconnect();

            controls.dispose();

            // dispose scene
            scene.traverse((obj: THREE.Object3D) => {
                if ((obj as any).geometry) (obj as any).geometry.dispose?.();
                if ((obj as any).material) {
                    const mat = (obj as any).material;
                    if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
                    else mat.dispose?.();
                }
            });

            renderer.dispose();
            if (renderer.domElement.parentElement === container) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    // Enter scene handler
    const enterScene = () => {
        if (selectedCharacter) {
            localStorage.setItem("avatar", selectedCharacter);
            alert(`Entering scene as ${selectedCharacter}`);
        }
    };

    return (
        <div
            ref={mountRef}
            style={{
                width: "100vw",
                height: "100dvh",
                maxHeight: "100svh",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* UI Button */}
            <button
                onClick={enterScene}
                disabled={!selectedCharacter}
                style={{
                    position: "absolute",
                    bottom: "clamp(16px, 6vh, 48px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    padding: "clamp(10px, 1.5vh, 14px) clamp(16px, 3vw, 28px)",
                    fontSize: "clamp(14px, 2.2vw, 18px)",
                    backgroundColor: selectedCharacter ? "#4f46e5" : "#555",
                    color: "#fff",
                    borderRadius: "10px",
                    cursor: selectedCharacter ? "pointer" : "not-allowed",
                    border: "none",
                    boxShadow: "0 8px 20px rgba(79,70,229,0.35)",
                }}
            >
                Enter Scene
            </button>
        </div>
    );
};

export default App;
