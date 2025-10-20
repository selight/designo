import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;       // e.g. "Guest-1234"
  color: string;      // random color for chat or annotation labels
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    default: () => {
      // Generate random color
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model<IUser>('User', UserSchema);
