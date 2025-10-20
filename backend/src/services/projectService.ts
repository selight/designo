import Project, { IProject, ISceneObject, IAnnotation, ICamera } from '../models/Project';
import User from '../models/User';

export interface CreateProjectData {
  title: string;
  ownerId?: string;
}

export interface UpdateProjectData {
  objects?: ISceneObject[];
  annotations?: IAnnotation[];
  camera?: ICamera;
}

export interface CreateAnnotationData {
  text: string;
  position: [number, number, number];
  normal?: [number, number, number];
  userId?: string;
}

export class ProjectService {
  /**
   * Get all projects of a userwith basic information
   */
  async getProjectsByUserId(userId: string): Promise<IProject[]> {
    try {
      const projects = await Project.find({ ownerId: userId })
        .select('title createdAt updatedAt')
        .sort({ updatedAt: -1 });
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw new Error('Failed to fetch projects');
    }
  }
  /**
   * Get a specific project with full scene data
   */
  async getProjectById(projectId: string): Promise<IProject | null> {
    try {
      const project = await Project.findById(projectId)
        .populate('annotations.userId', 'name color');
      
      return project;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw new Error('Failed to fetch project');
    }
  }

  /**
   * Create a new project
   */
  async createProject(data: CreateProjectData): Promise<IProject> {
    try {
      const { title, ownerId } = data;
      
      if (!title) {
        throw new Error('Title is required');
      }
      
      const project = new Project({
        title,
        ownerId,
        objects: [],
        annotations: [],
        camera: {
          position: [8, 6, 8],
          target: [0, 0, 0]
        }
      });
      
      await project.save();
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }
  }

  /**
   * Update a project (autosave)
   */
  async updateProject(projectId: string, data: UpdateProjectData): Promise<IProject | null> {
    try {
      const updateData: Partial<IProject> = {
        updatedAt: new Date()
      };
      
      if (data.objects) updateData.objects = data.objects;
      if (data.annotations) updateData.annotations = data.annotations;
      if (data.camera) updateData.camera = data.camera;
      
      const project = await Project.findByIdAndUpdate(
        projectId,
        updateData,
        { new: true, runValidators: true }
      ).populate('annotations.userId', 'name color');
      
      return project;
    } catch (error) {
      console.error('Error updating project:', error);
      throw new Error('Failed to update project');
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<boolean> {
    try {
      const result = await Project.findByIdAndDelete(projectId);
      return !!result;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw new Error('Failed to delete project');
    }
  }

  /**
   * Add an annotation to a project
   */
  async addAnnotation(projectId: string, data: CreateAnnotationData): Promise<IAnnotation> {
    try {
      const { text, position, normal, userId } = data;
      
      if (!text || !position) {
        throw new Error('Text and position are required');
      }
      
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      const annotation: IAnnotation = {
        id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text,
        position,
        normal,
        userId: userId ? userId as any : undefined,
        createdAt: new Date()
      };
      
      project.annotations.push(annotation);
      await project.save();
      
      // Populate the user data for the new annotation
      await project.populate('annotations.userId', 'name color');
      
      return annotation;
    } catch (error) {
      console.error('Error adding annotation:', error);
      throw new Error('Failed to add annotation');
    }
  }

  /**
   * Delete an annotation from a project
   */
  async deleteAnnotation(projectId: string, annotationId: string): Promise<boolean> {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      const initialLength = project.annotations.length;
      project.annotations = project.annotations.filter(
        annotation => annotation.id !== annotationId
      );
      
      if (project.annotations.length === initialLength) {
        throw new Error('Annotation not found');
      }
      
      await project.save();
      return true;
    } catch (error) {
      console.error('Error deleting annotation:', error);
      throw new Error('Failed to delete annotation');
    }
  }

  /**
   * Update an annotation in a project
   */
  async updateAnnotation(projectId: string, annotationId: string, data: Partial<CreateAnnotationData>): Promise<IAnnotation | null> {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      const annotation = project.annotations.find(ann => ann.id === annotationId);
      if (!annotation) {
        throw new Error('Annotation not found');
      }
      
      // Update annotation fields
      if (data.text) annotation.text = data.text;
      if (data.position) annotation.position = data.position;
      if (data.normal !== undefined) annotation.normal = data.normal;
      if (data.userId !== undefined) annotation.userId = data.userId as any;
      
      await project.save();
      await project.populate('annotations.userId', 'name color');
      
      return annotation;
    } catch (error) {
      console.error('Error updating annotation:', error);
      throw new Error('Failed to update annotation');
    }
  }

  /**
   * Add an object to a project
   */
  async addObject(projectId: string, object: ISceneObject): Promise<boolean> {
    try {
      const result = await Project.findByIdAndUpdate(
        projectId,
        { $push: { objects: object } },
        { new: true }
      );
      
      return !!result;
    } catch (error) {
      console.error('Error adding object:', error);
      throw new Error('Failed to add object');
    }
  }

  /**
   * Update an object in a project
   */
  async updateObject(projectId: string, objectId: string, object: ISceneObject): Promise<boolean> {
    try {
      const result = await Project.findByIdAndUpdate(
        projectId,
        { $set: { 'objects.$[elem]': object } },
        { arrayFilters: [{ 'elem.id': objectId }], new: true }
      );
      
      return !!result;
    } catch (error) {
      console.error('Error updating object:', error);
      throw new Error('Failed to update object');
    }
  }

  /**
   * Delete an object from a project
   */
  async deleteObject(projectId: string, objectId: string): Promise<boolean> {
    try {
      const result = await Project.findByIdAndUpdate(
        projectId,
        { $pull: { objects: { id: objectId } } },
        { new: true }
      );
      
      return !!result;
    } catch (error) {
      console.error('Error deleting object:', error);
      throw new Error('Failed to delete object');
    }
  }

  /**
   * Update camera position for a project
   */
  async updateCamera(projectId: string, camera: ICamera): Promise<boolean> {
    try {
      const result = await Project.findByIdAndUpdate(
        projectId,
        { $set: { camera } },
        { new: true }
      );
      
      return !!result;
    } catch (error) {
      console.error('Error updating camera:', error);
      throw new Error('Failed to update camera');
    }
  }
}

export const projectService = new ProjectService();
