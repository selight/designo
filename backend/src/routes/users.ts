import express, { Request, Response } from 'express';
import { userService } from '../services/userService';

const router = express.Router();

// GET /api/users - List all users
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get specific user
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch user' });
  }
});

// POST /api/users - Create new user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const existing = await userService.getUserByName(name);
    const user = await userService.createOrGetUser(name);
    const isNew = !existing;
    res.status(201).json({ user, isNew });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    
    const user = await userService.updateUser(req.params.id, { name, color });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await userService.deleteUser(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete user' });
  }
});

export default router;
