import mongoose, { Document, Schema } from 'mongoose';

export interface ISceneObject {
  id: string;
  type: "primitive" | "stl";
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  geometryJson?: any;
}

export interface IAnnotation {
  id: string;
  text: string;
  position: [number, number, number];
  normal?: [number, number, number];
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface ICamera {
  position: [number, number, number];
  target: [number, number, number];
}

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  ownerId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  objects: ISceneObject[];
  annotations: IAnnotation[];
  camera: ICamera;
}

const SceneObjectSchema = new Schema<ISceneObject>({
  id: { type: String, required: true },
  type: { type: String, enum: ['primitive', 'stl'], required: true },
  name: { type: String, required: true },
  position: { type: [Number], required: true, validate: [(array: any) => array.length === 3, 'Position must have 3 coordinates'] },
  rotation: { type: [Number], required: true, validate: [(array: any) => array.length === 3, 'Rotation must have 3 coordinates'] },
  scale: { type: [Number], required: true, validate: [(array: any) => array.length === 3, 'Scale must have 3 coordinates'] },
  geometryJson: { type: Schema.Types.Mixed }
}, { _id: false });

const AnnotationSchema = new Schema<IAnnotation>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  position: { type: [Number], required: true, validate: [(array: any) => array.length === 3, 'Position must have 3 coordinates'] },
  normal: { type: [Number], validate: [(array: any) => !array || array.length === 3, 'Normal must have 3 coordinates'] },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const CameraSchema = new Schema<ICamera>({
  position: { type: [Number], required: true, validate: [(array: any) => array.length === 3, 'Position must have 3 coordinates'] },
  target: { type: [Number], required: true, validate: [(array: any) => array.length === 3, 'Target must have 3 coordinates'] }
}, { _id: false });

const ProjectSchema = new Schema<IProject>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  objects: [SceneObjectSchema],
  annotations: [AnnotationSchema],
  camera: {
    type: CameraSchema,
    default: () => ({
      position: [8, 6, 8],
      target: [0, 0, 0]
    })
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
ProjectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IProject>('Project', ProjectSchema);
