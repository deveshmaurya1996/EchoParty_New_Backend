import mongoose from 'mongoose';
import { IVideo } from '../types/index.js';

const videoSchema = new mongoose.Schema<IVideo>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  videoId: {
    type: String,
    required: true,
    unique: true
  },
  telegramFileId: {
    type: String,
    required: true,
    unique: true
  },
  telegramMessageId: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  r2Key: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  streamUrl: {
    type: String,
    required: false
  },
  thumbnailUrl: {
    type: String,
    required: false
  },
  encodingStatus: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  encodingProgress: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient user video queries
videoSchema.index({ userId: 1, isActive: 1 });

export const Video = mongoose.model<IVideo>('Video', videoSchema); 