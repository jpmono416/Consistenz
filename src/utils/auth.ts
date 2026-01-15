import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

/**
 * Returns the current user's ID if logged in, or null if not logged in
 */
export const getCurrentUserId = (): string | null => {
  return auth.currentUser?.uid || null;
};

/**
 * Subscribes to authentication state changes
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function
 */
export const subscribeToAuthChanges = (
  callback: (userId: string | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user?.uid || null);
  });
};

