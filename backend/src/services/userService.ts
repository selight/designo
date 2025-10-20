import User, { IUser } from '../models/User';

export interface CreateUserData {
  name: string;
  color?: string;
}

export class UserService {
  /**
   * Create a new user or get existing user by name
   */
  async createOrGetUser(name: string): Promise<IUser> {
    try {
      let user = await User.findOne({ name });
      
      if (!user) {
        user = new User({ name });
        await user.save();
      }
      
      return user;
    } catch (error) {
      console.error('Error creating/getting user:', error);
      throw new Error('Failed to create/get user');
    }
  }

  /**
   * Create an anonymous user with random name
   */
  async createAnonymousUser(): Promise<IUser> {
    try {
      const randomName = `Guest-${Math.random().toString(36).substr(2, 6)}`;
      return await this.createOrGetUser(randomName);
    } catch (error) {
      console.error('Error creating anonymous user:', error);
      throw new Error('Failed to create anonymous user');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Get user by name
   */
  async getUserByName(name: string): Promise<IUser | null> {
    try {
      const user = await User.findOne({ name });
      return user;
    } catch (error) {
      console.error('Error fetching user by name:', error);
      throw new Error('Failed to fetch user by name');
    }
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, data: Partial<CreateUserData>): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        data,
        { new: true, runValidators: true }
      );
      
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      const result = await User.findByIdAndDelete(userId);
      return !!result;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<IUser[]> {
    try {
      const users = await User.find().sort({ createdAt: -1 });
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Generate a random color for users
   */
  generateRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3',
      '#FF9F43', '#10AC84', '#EE5A24', '#0984E3'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

export const userService = new UserService();
