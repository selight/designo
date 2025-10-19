import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { ProjectData, PrimitiveKind, SceneObject, STLObject, AnnotationObject } from "../lib/types";
import { loadProject, saveProject } from "../lib/storage";
import ThreeViewport from "../components/ThreeViewport";

type ViewportType = "perspective" | "top" | "front" | "right";

interface Props {
    projectId: string;
    onBack: () => void;
}

const Editor: React.FC<Props> = ({ projectId, onBack }) => {
    const stlLoader = useMemo(() => new STLLoader(), []);

    const [project, setProject] = useState<ProjectData | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeViewport, setActiveViewport] = useState<ViewportType>("perspective");

    // load project
    useEffect(() => {
        const loadedProject = loadProject(projectId);
        setProject(loadedProject);
        
        // Auto-select first model object if none selected and objects exist
        if (loadedProject && loadedProject.objects.length > 0 && !selectedId) {
            const firstModel = loadedProject.objects.find(obj => obj.type === "primitive" || obj.type === "stl");
            if (firstModel) {
                setSelectedId(firstModel.id);
            }
        }
    }, [projectId, selectedId]);

    const saveNow = (next: ProjectData) => {
        setProject(next);
        saveProject(next);
    };

    const addPrimitive = (kind: PrimitiveKind) => {
        if (!project) return;
        const id = crypto.randomUUID();
        const obj: SceneObject = {
            id,
            type: "primitive",
            kind,
            name: kind,
            visible: true,
            position: [0, 0.5, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
        } as any;
        console.log("Adding primitive:", obj);
        const next = { ...project, objects: [...project.objects, obj] };
        saveNow(next);
        setSelectedId(id);
    };

    const onUploadSTL = async (file: File) => {
        if (!project) return;
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const geom = stlLoader.parse(arrayBuffer as unknown as ArrayBuffer);
            
            // Simple approach like the working example
            geom.computeBoundingBox();
            
            // Basic scaling to fit in view
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
                geometryJson: geom.toJSON() // Simple JSON, no compression
            } as any;
            
            const next = { ...project, objects: [...project.objects, obj] };
            saveNow(next);
            setSelectedId(id);
        } catch (error) {
            console.error("Error uploading STL:", error);
            alert("Error uploading STL file. Please try again.");
        }
    };


    const onDeleteObject = (id: string) => {
        if (!project) return;
        
        // Delete the object and all its associated annotations
        const next = { 
            ...project, 
            objects: project.objects.filter(obj => {
                // Keep objects that are not the deleted object and not annotations belonging to it
                if (obj.id === id) return false; // Delete the main object
                if (obj.type === "annotation" && (obj as AnnotationObject).targetObjectId === id) {
                    return false; // Delete annotations that belong to this object
                }
                return true; // Keep everything else
            })
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
        console.log('Creating annotation with parentId:', finalParentId, 'from passed parentId:', parentId, 'selectedId:', selectedId);
        
        const obj: AnnotationObject = {
            id,
            type: "annotation",
            name: `Annotation ${project.objects.filter(o => o.type === "annotation").length + 1}`,
            visible: true,
            position: worldPosition,
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            text: text.trim(),
            normal,
            targetObjectId: finalParentId // 🟢 Use passed parentId or fallback to selectedId
        };
        
        const next = { ...project, objects: [...project.objects, obj] };
        saveNow(next);
        setSelectedId(id);
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
            <div className="absolute top-5 left-1/2 transform -translate-x-1/2 flex gap-2 bg-slate-900/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-700/30 shadow-2xl z-[1000]">
                <button 
                    onClick={onBack} 
                    className="px-4 py-2.5 rounded-xl border border-slate-600/50 bg-slate-800/80 text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-slate-800 hover:border-blue-500/50"
                >
                    ← Back
                </button>
                <div className="px-4 py-2.5 text-white text-base font-semibold flex items-center">
                    {project.title}
                </div>
                <div className="w-px h-6 bg-slate-600/50 mx-2" />
                
                {/* Shape Icons */}
                <button 
                    onClick={() => addPrimitive("cube")} 
                    className="p-3 rounded-xl border border-slate-600/50 bg-slate-800/80 text-white cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/50"
                    title="Add Cube"
                >
                    <div className="w-5 h-5 bg-white rounded" />
                </button>
                <button 
                    onClick={() => addPrimitive("sphere")} 
                    className="p-3 rounded-xl border border-slate-600/50 bg-slate-800/80 text-white cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/50"
                    title="Add Sphere"
                >
                    <div className="w-5 h-5 bg-white rounded-full" />
                </button>
                <button 
                    onClick={() => addPrimitive("cone")} 
                    className="p-3 rounded-xl border border-slate-600/50 bg-slate-800/80 text-white cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/50"
                    title="Add Cone"
                >
                    <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[20px] border-l-transparent border-r-transparent border-b-white" />
                </button>
                <div className="w-px h-6 bg-slate-600/50 mx-2" />
                <label className="p-3 rounded-xl border border-slate-600/50 bg-slate-900/80 text-white cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-indigo-500/20 hover:border-indigo-500/50">
                    <input 
                        type="file" 
                        accept=".stl" 
                        onChange={(e) => e.target.files && e.target.files[0] && onUploadSTL(e.target.files[0])} 
                        className="hidden"
                    />
                    <div className="w-5 h-5 flex items-center justify-center">
                        📁
                    </div>
                </label>
            </div>

            {/* Floating Right Toolbar */}
            <div className="absolute top-5 right-5 w-72 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/30 shadow-2xl z-[1000] p-5">


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
                    if ((window as any).resetCamera) {
                        (window as any).resetCamera();
                    }
                }}
                onPlaceAnnotation={onPlaceAnnotation}
                onUpdateObject={onUpdateObject}
            />
        </div>
    );
};

export default Editor;


