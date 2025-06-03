import admin from 'firebase-admin';
import { config } from './index';

let firebaseApp: admin.app.App;

export const initializeFirebase = (): admin.app.App => {
  if (!firebaseApp) {
    try {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
      });
      console.log('✅ Firebase Admin SDK initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase:', error);
      throw error;
    }
  }
  return firebaseApp;
};

export const getFirebaseAdmin = (): admin.app.App => {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
};

export const getMessaging = (): admin.messaging.Messaging => {
  return getFirebaseAdmin().messaging();
};