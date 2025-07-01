import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  publitioId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  streamUrl: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    required: false,
  },
  size: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for efficient user video queries
videoSchema.index({ userId: 1, isActive: 1 });
videoSchema.index({ publitioId: 1 });

videoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Video = mongoose.model('Video', videoSchema); 