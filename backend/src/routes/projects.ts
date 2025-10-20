import express, { Request, Response } from 'express';
import { projectService } from '../services/projectService';

const router = express.Router();

// GET /api/projects - List all projects of a User
router.get('/', async (req: Request, res: Response) => {
  try {
    const ownerId = req.query.ownerId as string;
    const projects = await projectService.getProjectsByUserId(ownerId);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch projects' });
  }
});


// GET /api/projects/:id - Get specific project with full scene data
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch project' });
  }
});

// POST /api/projects - Create new project
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, ownerId } = req.body;
    
    const project = await projectService.createProject({ title, ownerId });
    res.status(201).json(project);
  } catch (error) {
    const statusCode = error instanceof Error && error.message === 'Title is required' ? 400 : 500;
    res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Failed to create project' });
  }
});

// PUT /api/projects/:id - Update project (autosave)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { objects, annotations, camera } = req.body;
    
    const project = await projectService.updateProject(req.params.id, {
      objects,
      annotations,
      camera
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update project' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await projectService.deleteProject(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete project' });
  }
});

// POST /api/projects/:id/annotations - Add annotation
router.post('/:id/annotations', async (req: Request, res: Response) => {
  try {
    const { text, position, normal, userId } = req.body;
    
    const annotation = await projectService.addAnnotation(req.params.id, {
      text,
      position,
      normal,
      userId
    });
    
    res.status(201).json(annotation);
  } catch (error) {
    const statusCode = error instanceof Error && error.message === 'Text and position are required' ? 400 : 500;
    res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Failed to add annotation' });
  }
});

// PUT /api/projects/:id/annotations/:annotationId - Update annotation
router.put('/:id/annotations/:annotationId', async (req: Request, res: Response) => {
  try {
    const { text, position, normal, userId } = req.body;
    
    const annotation = await projectService.updateAnnotation(req.params.id, req.params.annotationId, {
      text,
      position,
      normal,
      userId
    });
    
    if (!annotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    
    res.json(annotation);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update annotation' });
  }
});

// DELETE /api/projects/:id/annotations/:annotationId - Delete annotation
router.delete('/:id/annotations/:annotationId', async (req: Request, res: Response) => {
  try {
    const deleted = await projectService.deleteAnnotation(req.params.id, req.params.annotationId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    
    res.json({ message: 'Annotation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete annotation' });
  }
});

export default router;
