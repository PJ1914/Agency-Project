'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { firestoreService } from '@/lib/firestore';
import { QueryConstraint } from 'firebase/firestore';

export function useFirestore<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await firestoreService.getAll<T>(collectionName, constraints);
      if (isMounted.current) {
        setData(result);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err as Error);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [collectionName]); // Removed constraints from dependencies

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    
    return () => {
      isMounted.current = false;
    };
  }, [collectionName]); // Only re-fetch when collection name changes

  const addItem = async (item: any) => {
    try {
      const id = await firestoreService.add(collectionName, item);
      await fetchData(); // Refresh data
      return id;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateItem = async (id: string, item: Partial<any>) => {
    try {
      await firestoreService.update(collectionName, id, item);
      await fetchData(); // Refresh data
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await firestoreService.delete(collectionName, id);
      await fetchData(); // Refresh data
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    addItem,
    updateItem,
    deleteItem,
  };
}
