import Joi from 'joi';

export const authValidators = {
  googleCallback: Joi.object({
    code: Joi.string().required(),
    state: Joi.string().optional(),
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

export const roomValidators = {
  createRoom: Joi.object({
    name: Joi.string().min(3).max(50).required(),
    maxParticipants: Joi.number().min(2).max(50).optional(),
  }),
  
  joinRoom: Joi.object({
    roomCode: Joi.string().length(6).uppercase().required(),
  }),
  
  updateMedia: Joi.object({
    type: Joi.string().valid('youtube', 'file').required(),
    url: Joi.string().uri().required(),
    title: Joi.string().required(),
    duration: Joi.number().optional(),
  }),
  
  syncMedia: Joi.object({
    currentTime: Joi.number().min(0).required(),
    isPlaying: Joi.boolean().required(),
  }),
};

export const notificationValidators = {
  registerToken: Joi.object({
    fcmToken: Joi.string().required(),
  }),
  
  updatePreferences: Joi.object({
    roomInvites: Joi.boolean().optional(),
    roomActivity: Joi.boolean().optional(),
    mediaUpdates: Joi.boolean().optional(),
  }),
};

export const mediaValidators = {
  searchYoutube: Joi.object({
    query: Joi.string().min(1).max(100).required(),
    maxResults: Joi.number().min(1).max(50).optional(),
  }),
  
  uploadFile: Joi.object({
    roomCode: Joi.string().length(6).uppercase().required(),
  }),
};