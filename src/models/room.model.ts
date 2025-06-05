import mongoose, { Schema } from 'mongoose';
import { IRoom } from '../types';

const roomSchema = new Schema<IRoom>(
  {
    roomId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['youtube', 'movie'],
      required: true,
    },
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    currentMedia: {
      id: String,
      title: String,
      duration: Number,
      url: String,
    },
    playbackState: {
      isPlaying: {
        type: Boolean,
        default: false,
      },
      currentTime: {
        type: Number,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false
  },
);

// Index for pagination and filtering
roomSchema.index({ owner: 1, createdAt: -1 });
roomSchema.index({ isActive: 1, createdAt: -1 });

export const Room = mongoose.model<IRoom>('Room', roomSchema);