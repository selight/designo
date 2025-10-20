export interface UserProfile {
    id: string;
    name: string;
}

export interface ProjectSummary {
    id: string;
    title: string;
    updatedAt: number;
}

export type PrimitiveKind = "cube" | "sphere" | "cone";

export interface SceneObjectBase {
    id: string;
    name: string;
    visible: boolean;
    position: [number, number, number];
    rotation: [number, number, number]; // Euler in radians
    scale: [number, number, number];
}

export interface PrimitiveObject extends SceneObjectBase {
    type: "primitive";
    kind: PrimitiveKind;
}

export interface STLObject extends SceneObjectBase {
    type: "stl";
    geometryJson: any; // BufferGeometry.toJSON()
}

export interface AnnotationObject extends SceneObjectBase {
    type: "annotation";
    normal?: [number, number, number];
    text: string;
    index?: number;
    targetObjectId?: string; // ID of the object this annotation belongs to
    createdAt?: string;
}

export type SceneObject = PrimitiveObject | STLObject | AnnotationObject;

export interface ProjectData {
    id: string;
    title: string;
    objects: SceneObject[];
    updatedAt: number;
    camera?: {
        position: [number, number, number];
        target: [number, number, number];
    };
}


