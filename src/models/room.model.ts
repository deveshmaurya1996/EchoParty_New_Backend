import mongoose, { Schema } from 'mongoose';
import { IRoom } from '../types';

const messageSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const mediaSchema = new Schema({
  id: String,
  title: String,
  duration: Number,
  url: String,
  thumbnail: String,
  type: String,
}, { _id: false });

const roomSchema = new Schema<IRoom>(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
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
      enum: ['youtube', 'movie', 'music', 'other'],
      required: true,
    },
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    currentMedia: {
      type: mediaSchema,
      default: null,
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
    permissions: {
      allowParticipantControl: {
        type: Boolean,
        default: false,
      },
      allowedControllers: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
    },
    messages: [messageSchema],
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

// Indexes
roomSchema.index({ roomId: 1 });
roomSchema.index({ owner: 1, createdAt: -1 });
roomSchema.index({ participants: 1 });
roomSchema.index({ isActive: 1, createdAt: -1 });

export const Room = mongoose.model<IRoom>('Room', roomSchema);