import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

export function signIn(code: string, password: string) {
  const normalizedCode = code.trim().toLowerCase();
  return signInWithEmailAndPassword(
    auth,
    `${normalizedCode}@songsong.local`,
    password,
  );
}

export function signOut() {
  return firebaseSignOut(auth);
}

export function observeCurrentUser(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
