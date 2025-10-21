import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { ProjectData, PrimitiveKind, SceneObject, STLObject, AnnotationObject } from "../lib/types.ts";

// Define types for socket data
interface SocketData {
    action: 'add' | 'update' | 'delete';
    object?: SceneObject;
    objectId?: string;
}

interface WindowWithSocket extends Window {
    socket?: {
        on: (event: string, handler: (data: SocketData) => void) => void;
        off: (event: string, handler: (data: SocketData) => void) => void;
    };
    resetCamera?: () => void;
}
import { loadProject, saveProject } from "../lib/storage.ts";
import { getProject, updateProjectApi } from "../lib/api.ts";
import ThreeViewport from "../components/ThreeViewport.tsx";
import UserPresence from "../components/UserPresence.tsx";
import { useSocket } from "../lib/useSocket.ts";

type ViewportType = "perspective" | "top" | "front" | "right";

const Editor: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const stlLoader = useMemo(() => new STLLoader(), []);

    const [project, setProject] = useState<ProjectData | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeViewport, setActiveViewport] = useState<ViewportType>("perspective");

    // WebSocket integration
    const {
        connected,
        roomUsers,
        sendCameraMove,
        sendObjectChange
    } = useSocket(projectId || '');

    // load project
    useEffect(() => {
        if (!projectId) return;
        (async () => {
            try {
                const remote = await getProject(projectId);
                const loadedProject = {
                    id: remote._id,
                    title: remote.title,
                    objects: (remote.objects as SceneObject[]) ?? [],
                    updatedAt: new Date(remote.updatedAt).getTime(),
                    camera: remote.camera || { position: [8,6,8], target: [0,0,0] }
                } as ProjectData;
                
                
                setProject(loadedProject);
                if (loadedProject && loadedProject.objects.length > 0 && !selectedId) {
                    const firstModel = loadedProject.objects.find(obj => obj.type === "primitive" || obj.type === "stl");
                    if (firstModel) {
                        setSelectedId(firstModel.id);
                    }
                }
            } catch {
                const local = loadProject(projectId);
                setProject(local);
                if (local && local.objects.length > 0 && !selectedId) {
                    const firstModel = local.objects.find(obj => obj.type === "primitive" || obj.type === "stl");
                    if (firstModel) setSelectedId(firstModel.id);
                }
            }
        })();
    }, [projectId, selectedId]);

    const saveNow = async (next: ProjectData, skipWebSocket = false) => {
        setProject(next);
        saveProject(next);
        try {
            await updateProjectApi(next.id, { objects: next.objects });
            
            if (connected && !skipWebSocket) {
                if (project) {
                    const oldObjects = project.objects;
                    const newObjects = next.objects;
                    
                    const added = newObjects.filter(newObj => !oldObjects.find(oldObj => oldObj.id === newObj.id));
                    const updated = newObjects.filter(newObj => {
                        const oldObj = oldObjects.find(old => old.id === newObj.id);
                        return oldObj && JSON.stringify(oldObj) !== JSON.stringify(newObj);
                    });
                    const deleted = oldObjects.filter(oldObj => !newObjects.find(newObj => newObj.id === oldObj.id));
                    
                    added.forEach(obj => sendObjectChange('add', obj));
                    updated.forEach(obj => sendObjectChange('update', obj));
                    deleted.forEach(obj => sendObjectChange('delete', undefined, obj.id));
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Debounced camera change handler
    const cameraChangeTimeoutRef = useRef<number | null>(null);
    const debouncedCameraChange = useCallback((cam: { position: [number, number, number]; target: [number, number, number] }) => {
        // Clear existing timeout
        if (cameraChangeTimeoutRef.current) {
            clearTimeout(cameraChangeTimeoutRef.current);
        }
        
        // Set new timeout - only update after 500ms of inactivity
        cameraChangeTimeoutRef.current = setTimeout(() => {
            if (project) {
                updateProjectApi(project.id, { camera: { position: cam.position, target: cam.target } }).catch(() => {});
                
                if (connected) {
                    sendCameraMove(cam.position, cam.target);
                }
            }
        }, 500);
    }, [project, connected, sendCameraMove]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (cameraChangeTimeoutRef.current) {
                clearTimeout(cameraChangeTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!connected || !project) return;

        const handleObjectChange = (data: SocketData) => {
            if (data.action === 'add' && data.object) {
                // Check if object already exists to prevent duplicates
                const exists = project.objects.find(obj => obj.id === data.object!.id);
                if (!exists) {
                    const next = { ...project, objects: [...project.objects, data.object] };
                    saveNow(next, true);
                }
            } else if (data.action === 'update' && data.object) {
                const next = {
                    ...project,
                    objects: project.objects.map(obj => obj.id === data.object!.id ? data.object! : obj)
                };
                saveNow(next, true);
            } else if (data.action === 'delete' && data.objectId) {
                const next = {
                    ...project,
                    objects: project.objects.filter(obj => obj.id !== data.objectId)
                };
                saveNow(next, true);
            }
        };

        const socket = (window as WindowWithSocket).socket;
        if (socket) {
            socket.on('object-changed', handleObjectChange);
        }

        return () => {
            if (socket) {
                socket.off('object-changed', handleObjectChange);
            }
        };
    }, [connected, project, saveNow]);

    const addPrimitive = (kind: PrimitiveKind) => {
        if (!project) return;
        const id = crypto.randomUUID();
        const obj: SceneObject = {
            id,
            type: "primitive",
            kind,
            name: kind === "cube" ? "Cube" : kind === "sphere" ? "Sphere" : "Cone",
            visible: true,
            position: [0, 0.5, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
        } as SceneObject;
        const next = { ...project, objects: [...project.objects, obj] };
        saveNow(next);
        setSelectedId(id);
    };

    const onUploadSTL = async (file: File) => {
        if (!project) return;
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const geom = stlLoader.parse(arrayBuffer as unknown as ArrayBuffer);
            geom.computeBoundingBox();
            if (geom.boundingBox) {
                const size = new THREE.Vector3();
                geom.boundingBox.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z) || 1;
                const scale = 3 / maxDim; // Make it 3 units max
                
                const center = new THREE.Vector3();
                geom.boundingBox.getCenter(center);
                
                // Center and scale
                geom.translate(-center.x, -center.y, -center.z);
                geom.scale(scale, scale, scale);
                
            }
            
            const id = crypto.randomUUID();
        const obj: STLObject = {
                id,
                type: "stl",
                name: file.name,
                visible: true,
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
                geometryJson: geom.toJSON()
            } as STLObject;
            
            // Save to backend first; only update UI after success
            const next = { ...project, objects: [...project.objects, obj] };
            await updateProjectApi(project.id, { objects: next.objects });
            await saveNow(next);
            setSelectedId(id);
        } catch (error) {
            console.error("Error uploading STL:", error);
            alert("Error uploading STL file. Please try again.");
        }
    };


    const onDeleteObject = (id: string) => {
        if (!project) return;
        
        const next = {
            ...project,
            objects: project.objects.filter(obj => 
                obj.id !== id && !(obj.type === "annotation" && (obj as AnnotationObject).targetObjectId === id)
            )
        };
        
        saveNow(next);
        if (selectedId === id) {
            setSelectedId(null);
        }
    };

    const onPlaceAnnotation = (worldPosition: [number, number, number], normal?: [number, number, number], text?: string, parentId?: string) => {
        if (!project || !text?.trim()) return;
        const id = crypto.randomUUID();
        const finalParentId = parentId || selectedId || undefined;
        const obj: AnnotationObject = {
            id,
            type: "annotation",
            name: `Annotation ${project.objects.filter(o => o.type === "annotation").length + 1}`,
            visible: true, // Make annotations visible by default
            position: worldPosition,
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            text: text.trim(),
            normal,
            targetObjectId: finalParentId
        };
        
        
        const next = { ...project, objects: [...project.objects, obj] };
        saveNow(next);
    };

    const onUpdateObject = (id: string, updates: Partial<SceneObject>) => {
        if (!project) return;
        
        const next = {
            ...project,
            objects: project.objects.map(obj => 
                obj.id === id ? { ...obj, ...updates } as SceneObject : obj
            )
        };
        saveNow(next);
    };

    if (!project) return null;

    return (
        <div className="w-screen h-screen relative">
            {/* Floating Top Toolbar */}
            <div className="absolute top-4 left-1/2 sm:left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/30 shadow-2xl z-[1000] max-w-[95vw]">
                {/* Left section - Back button and title */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => navigate("/projects")} 
                        className="px-2 py-1.5 rounded-lg border border-slate-600/50 bg-slate-800/80 text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-slate-800 hover:border-blue-500/50"
                    >
                        Back
                    </button>
                    <div className="px-2 py-1.5 text-white text-sm font-semibold whitespace-nowrap">
                        {project.title}
                    </div>
                </div>
                
                {/* Vertical divider */}
                <div className="w-px h-5 bg-slate-600/50" />
                
                {/* Right section - Shape tools */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => addPrimitive("cube")} 
                        className="p-2 rounded-lg border border-slate-600/50 bg-slate-800/80 text-white cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/50"
                        title="Add Cube"
                    >
                        <div className="w-4 h-4 bg-white rounded" />
                    </button>
                    <button 
                        onClick={() => addPrimitive("sphere")} 
                        className="p-2 rounded-lg border border-slate-600/50 bg-slate-800/80 text-white cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/50"
                        title="Add Sphere"
                    >
                        <div className="w-4 h-4 bg-white rounded-full" />
                    </button>
                    <button 
                        onClick={() => addPrimitive("cone")} 
                        className="p-2 rounded-lg border border-slate-600/50 bg-slate-800/80 text-white cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/50"
                        title="Add Cone"
                    >
                        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[16px] border-l-transparent border-r-transparent border-b-white" />
                    </button>
                    <label className="p-2 rounded-lg border border-slate-600/50 bg-slate-900/80 text-white cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-blue-500/20 hover:border-indigo-500/50">
                        <input 
                            type="file" 
                            accept=".stl" 
                            onChange={(e) => e.target.files && e.target.files[0] && onUploadSTL(e.target.files[0])} 
                            className="hidden"
                        />
                        <div className="w-4 h-4 flex items-center justify-center text-lg">
                            📁
                        </div>
                    </label>
                </div>
            </div>

            {/* Floating Right Toolbar */}
            <div className="absolute top-20 right-4 w-72 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/30 shadow-2xl z-[1000] p-5">

                {/* User Presence - show when connected */}
                {connected && (
                    <div className="mb-4">
                        <UserPresence users={roomUsers} isVisible={connected} />
                    </div>
                )}

                {/* Position Controls */}
                {selectedId && (
                    <div className="mb-4">
                        <h3 className="text-white text-xs font-semibold mb-2 uppercase tracking-wide">
                            Position
                        </h3>
                        <div className="grid grid-cols-3 gap-1.5">
                            {['X', 'Y', 'Z'].map((axis, index) => {
                                const selectedObject = project.objects.find(obj => obj.id === selectedId);
                                const value = selectedObject ? (selectedObject.position[index] || 0) : 0;
                                
                                return (
                                    <div key={axis} className="flex flex-col gap-0.5">
                                        <label className="text-slate-400 text-xs font-medium text-center">
                                            {axis}
                                        </label>
                                        <input
                                            type="number"
                                            value={value.toFixed(2)}
                                            onChange={(e) => {
                                                if (!selectedObject) return;
                                                const newValue = parseFloat(e.target.value) || 0;
                                                const newPosition: [number, number, number] = [...selectedObject.position];
                                                newPosition[index] = newValue;
                                                onUpdateObject(selectedId, { position: newPosition });
                                            }}
                                            className="px-1.5 py-1 rounded-md border border-slate-600/50 bg-slate-800/80 text-white text-xs text-center outline-none w-full min-w-0 focus:border-blue-500/50"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Rotation Controls */}
                {selectedId && (
                    <div className="mb-4">
                        <h3 className="text-white text-xs font-semibold mb-2 uppercase tracking-wide">
                            Rotation
                        </h3>
                        <div className="grid grid-cols-3 gap-1.5">
                            {['X', 'Y', 'Z'].map((axis, index) => {
                                const selectedObject = project.objects.find(obj => obj.id === selectedId);
                                const value = selectedObject ? ((selectedObject.rotation[index] || 0) * 180 / Math.PI) : 0; // Convert to degrees
                                
                                return (
                                    <div key={axis} className="flex flex-col gap-0.5">
                                        <label className="text-slate-400 text-xs font-medium text-center">
                                            {axis}
                                        </label>
                                        <input
                                            type="number"
                                            value={value.toFixed(1)}
                                            onChange={(e) => {
                                                if (!selectedObject) return;
                                                const newValue = (parseFloat(e.target.value) || 0) * Math.PI / 180; // Convert to radians
                                                const newRotation: [number, number, number] = [...selectedObject.rotation];
                                                newRotation[index] = newValue;
                                                onUpdateObject(selectedId, { rotation: newRotation });
                                            }}
                                            className="px-1.5 py-1 rounded-md border border-slate-600/50 bg-slate-800/80 text-white text-xs text-center outline-none w-full min-w-0 focus:border-blue-500/50"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Scale Controls */}
                {selectedId && (
                    <div className="mb-4">
                        <h3 className="text-white text-xs font-semibold mb-2 uppercase tracking-wide">
                            Scale
                        </h3>
                        <div className="grid grid-cols-3 gap-1.5">
                            {['X', 'Y', 'Z'].map((axis, index) => {
                                const selectedObject = project.objects.find(obj => obj.id === selectedId);
                                const value = selectedObject ? (selectedObject.scale[index] || 1) : 1;
                                
                                return (
                                    <div key={axis} className="flex flex-col gap-0.5">
                                        <label className="text-slate-400 text-xs font-medium text-center">
                                            {axis}
                                        </label>
                                        <input
                                            type="number"
                                            value={value.toFixed(2)}
                                            onChange={(e) => {
                                                if (!selectedObject) return;
                                                const newValue = parseFloat(e.target.value) || 1;
                                                const newScale: [number, number, number] = [...selectedObject.scale];
                                                newScale[index] = newValue;
                                                onUpdateObject(selectedId, { scale: newScale });
                                            }}
                                            className="px-1.5 py-1 rounded-md border border-slate-600/50 bg-slate-800/80 text-white text-xs text-center outline-none w-full min-w-0 focus:border-blue-500/50"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {/* Viewport Controls */}
                <div className="mb-6">
                    <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">
                        Viewport
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => setActiveViewport("perspective")} 
                        className={`px-4 py-3 rounded-xl border text-white text-xs font-medium cursor-pointer transition-all duration-200 ${
                            activeViewport === "perspective" 
                                ? "bg-blue-500/20 border-blue-500/50" 
                                : "bg-slate-800/80 border-slate-600/50 hover:bg-blue-500/20 hover:border-blue-500/50"
                        }`}
                    >
                        3D View
                    </button>
                    <button 
                        onClick={() => setActiveViewport("top")} 
                        className={`px-4 py-3 rounded-xl border text-white text-xs font-medium cursor-pointer transition-all duration-200 ${
                            activeViewport === "top" 
                                ? "bg-blue-500/20 border-blue-500/50" 
                                : "bg-slate-800/80 border-slate-600/50 hover:bg-blue-500/20 hover:border-blue-500/50"
                        }`}
                    >
                        Top View
                    </button>
                    <button 
                        onClick={() => setActiveViewport("front")} 
                        className={`px-4 py-3 rounded-xl border text-white text-xs font-medium cursor-pointer transition-all duration-200 ${
                            activeViewport === "front" 
                                ? "bg-blue-500/20 border-blue-500/50" 
                                : "bg-slate-800/80 border-slate-600/50 hover:bg-blue-500/20 hover:border-blue-500/50"
                        }`}
                    >
                        Front View
                    </button>
                    <button 
                        onClick={() => setActiveViewport("right")} 
                        className={`px-4 py-3 rounded-xl border text-white text-xs font-medium cursor-pointer transition-all duration-200 ${
                            activeViewport === "right" 
                                ? "bg-blue-500/20 border-blue-500/50" 
                                : "bg-slate-800/80 border-slate-600/50 hover:bg-blue-500/20 hover:border-blue-500/50"
                        }`}
                    >
                        Right View
                    </button>
                    </div>
                </div>
                
                {/* Object Actions */}
                {selectedId && (
                    <div>
                        <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wide">
                            Object
                        </h3>
                    <button 
                        onClick={() => onDeleteObject(selectedId)} 
                        className="w-full px-4 py-3 rounded-xl border border-red-500/50 bg-red-500/20 text-white text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-red-500/30 hover:border-red-500/70"
                    >
                        Delete Object
                    </button>
                    </div>
                )}
            </div>

            <ThreeViewport
                project={project}
                selectedId={selectedId}
                activeViewport={activeViewport}
                onAddPrimitive={addPrimitive}
                onUploadSTL={onUploadSTL}
                onSelectObject={setSelectedId}
                onDeleteObject={onDeleteObject}
                onResetCamera={() => {
                    const resetCamera = (window as WindowWithSocket).resetCamera;
                    if (resetCamera) {
                        resetCamera();
                    }
                }}
                onPlaceAnnotation={onPlaceAnnotation}
                onUpdateObject={onUpdateObject}
                onCameraChange={debouncedCameraChange}
            />
            
        </div>
    );
};

export default Editor;


