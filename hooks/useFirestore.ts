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

  // Serialize constraints to detect changes
  const constraintsKey = JSON.stringify(
    constraints.map(c => {
      // Extract the constraint type and value for comparison
      const constraint = c as any;
      return {
        type: constraint.type,
        fieldPath: constraint._field?.segments?.join('.'),
        op: constraint.op,
        value: constraint.value
      };
    })
  );
  
  // Log constraint changes for debugging
  useEffect(() => {
    if (constraints.length > 0) {
      const orgIdConstraint = constraints.find((c: any) => 
        c._field?.segments?.includes('organizationId')
      ) as any;
      
      if (orgIdConstraint) {
        console.log(`🔄 [useFirestore] ${collectionName} - Organization filter:`, orgIdConstraint.value);
      }
    }
  }, [constraintsKey, collectionName]);

  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      setError(null);
      // Clear old data immediately when constraints change to prevent stale data display
      setData([]);
      
      const result = await firestoreService.getAll<T>(collectionName, constraints);
      
      // Log what was fetched for debugging
      console.log(`📦 [useFirestore] ${collectionName} fetched ${result.length} items`);
      
      if (isMounted.current) {
        setData(result);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err as Error);
        setData([]); // Clear data on error
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [collectionName, constraintsKey]); // Include constraintsKey to detect changes

  useEffect(() => {
    isMounted.current = true;
    
    // Don't fetch if constraints array is empty (no organizationId filter)
    // This is expected when waiting for organization to load - no need to warn
    if (constraints.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }
    
    // Clear data when constraints change (organization switch)
    setData([]);
    setLoading(true);
    
    fetchData();
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchData, constraints.length, collectionName]); // Re-fetch when fetchData changes (which includes constraints)

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
