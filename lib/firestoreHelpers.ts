import { firestoreService } from './firestore';
import { DocumentData } from 'firebase/firestore';

/**
 * Wrapper around firestore operations that automatically includes organizationId
 */

export async function addDocumentWithOrg<T extends DocumentData>(
  collectionName: string,
  data: T,
  organizationId: string
): Promise<string> {
  return firestoreService.add(collectionName, {
    ...data,
    organizationId,
  });
}

export async function updateDocumentWithOrg<T extends DocumentData>(
  collectionName: string,
  id: string,
  data: Partial<T>,
  organizationId: string
): Promise<void> {
  return firestoreService.update(collectionName, id, {
    ...data,
    organizationId,
  });
}

// Re-export other methods
export const { getAll, getById, delete: deleteDocument } = firestoreService;
export const addDocument = firestoreService.add;
export const updateDocument = firestoreService.update;
