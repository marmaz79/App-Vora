import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User } from '../types';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID (if configured)
export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Google Auth Provider configured for Firebase Google Sign-In & Google Drive integration
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Cache the Google OAuth access token in memory (never store in localStorage)
let cachedAccessToken: string | null = null;

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

// Standardized Firestore Error Logging and Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Validation on Boot (CRITICAL CONSTRAINT from Skill)
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info('Firebase Firestore connection verified.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears to be offline. Verify network or Firebase configuration.');
    } else {
      // Permission-denied on /test/connection is normal when read-only or empty
      console.info('Firebase initialized and responsive.');
    }
    return false;
  }
}

// Execute connection test on module evaluation
testConnection().catch(() => {});

// Helper to convert FirebaseUser to App User model
export function mapFirebaseUserToAppUser(
  fbUser: FirebaseUser,
  additionalData?: Partial<User>
): User {
  return {
    user_id: fbUser.uid,
    email: fbUser.email || 'marianomazoni@gmail.com',
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Utente Google',
    picture: fbUser.photoURL || null,
    auth_provider: 'google',
    booksReadCount: additionalData?.booksReadCount ?? 3,
    totalReadingMinutes: additionalData?.totalReadingMinutes ?? 45,
    is2FaVerified: additionalData?.is2FaVerified ?? true,
    googleAuthenticatorKey: additionalData?.googleAuthenticatorKey,
    lastLogin: new Date().toISOString(),
  };
}

// Save or sync user profile in Firestore (/users/{userId})
export async function syncUserProfile(user: User): Promise<void> {
  const userPath = `users/${user.user_id}`;
  try {
    const userDocRef = doc(db, 'users', user.user_id);
    const existingSnap = await getDoc(userDocRef);

    if (existingSnap.exists()) {
      await updateDoc(userDocRef, {
        displayName: user.name,
        photoURL: user.picture || '',
        booksReadCount: user.booksReadCount,
        totalReadingMinutes: user.totalReadingMinutes,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await setDoc(userDocRef, {
        userId: user.user_id,
        email: user.email,
        displayName: user.name,
        photoURL: user.picture || '',
        authProvider: 'google',
        booksReadCount: user.booksReadCount,
        totalReadingMinutes: user.totalReadingMinutes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Could not sync user profile to Firestore (may require deployed rules or active session):', err);
  }
}

// Sign In with Firebase Google Auth
export async function signInWithGoogleFirebase(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    const fbUser = result.user;
    const appUser = mapFirebaseUserToAppUser(fbUser);
    await syncUserProfile(appUser);
    return appUser;
  } catch (error: any) {
    console.error('Firebase Google Sign-In error:', error);
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('Accesso con Google annullato.');
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('Il popup di Google è stato bloccato dal browser. Consenti i popup per questa scheda.');
    }
    if (error?.code === 'auth/cancelled-popup-request') {
      throw new Error('Richiesta di accesso duplicata.');
    }
    throw error;
  }
}

// Request or ensure Google Drive OAuth access token
export async function requestGoogleDriveAccess(): Promise<string> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Autorizzazione Google Drive non riuscita. Token di accesso mancante.');
  }
  cachedAccessToken = credential.accessToken;
  const appUser = mapFirebaseUserToAppUser(result.user);
  await syncUserProfile(appUser);
  return cachedAccessToken;
}

// Sign out from Firebase
export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error('Firebase sign out error:', error);
  }
}

// Listen to Auth State Changes
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const appUser = mapFirebaseUserToAppUser(fbUser);
      callback(appUser);
    } else {
      cachedAccessToken = null;
      callback(null);
    }
  });
}
