import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs,
  DocumentData,
  QueryDocumentSnapshot,
  Query
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useState, useEffect } from 'react';

interface PaginatedDataOptions {
  collectionName: string;
  organizationId?: string;
  pageSize?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  queryKey: string[];
}

export function usePaginatedData<T extends { id: string }>({
  collectionName,
  organizationId,
  pageSize = 50,
  orderByField = 'createdAt',
  orderDirection = 'desc',
  queryKey,
}: PaginatedDataOptions) {
  const [page, setPage] = useState(0);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [allPages, setAllPages] = useState<QueryDocumentSnapshot<DocumentData>[][]>([[]]);
  const queryClient = useQueryClient();

  // Reset pagination when organizationId changes
  useEffect(() => {
    console.log(`🔄 [usePaginatedData] ${collectionName} - Organization changed to:`, organizationId);
    setPage(0);
    setLastVisible(null);
    setAllPages([[]]);
    // Invalidate queries for this collection to force refetch
    queryClient.invalidateQueries({ queryKey });
  }, [organizationId, collectionName]);

  const fetchPage = async (pageIndex: number): Promise<{ data: T[]; hasMore: boolean }> => {
    try {
      console.log(`📦 [usePaginatedData] Fetching ${collectionName} page ${pageIndex} for org:`, organizationId);
      
      let q: Query<DocumentData> = collection(db, collectionName);

      // Build query
      const constraints: any[] = [];
      
      if (organizationId) {
        constraints.push(where('organizationId', '==', organizationId));
        console.log(`  ✓ Applied organizationId filter:`, organizationId);
      } else {
        console.warn(`  ⚠️  No organizationId provided for ${collectionName}!`);
      }
      
      constraints.push(orderBy(orderByField, orderDirection));
      constraints.push(limit(pageSize + 1)); // Fetch one extra to check if there are more

      // Get the last document from the previous page
      if (pageIndex > 0 && allPages[pageIndex - 1]?.length > 0) {
        const lastDoc = allPages[pageIndex - 1][allPages[pageIndex - 1].length - 1];
        constraints.push(startAfter(lastDoc));
      }

      q = query(q, ...constraints);

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      
      console.log(`  📊 Fetched ${docs.length} documents (showing ${Math.min(docs.length, pageSize)})`);

      // Store the current page's documents for pagination
      setAllPages(prev => {
        const newPages = [...prev];
        newPages[pageIndex] = docs.slice(0, pageSize);
        return newPages;
      });

      const hasMore = docs.length > pageSize;
      const items = docs.slice(0, pageSize).map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as T));
      
      // Log sample of fetched items
      if (items.length > 0) {
        console.log(`  📝 Sample item:`, {
          id: items[0].id,
          name: (items[0] as any).productName || (items[0] as any).name,
          organizationId: (items[0] as any).organizationId
        });
      }

      if (docs.length > 0) {
        setLastVisible(docs[Math.min(docs.length - 1, pageSize - 1)]);
      }

      return { data: items, hasMore };
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      throw error;
    }
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKey, page],
    queryFn: () => fetchPage(page),
    staleTime: 0, // Always fetch fresh data when organization changes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes but mark as stale immediately
    enabled: organizationId !== undefined, // Only fetch when organizationId is available
  });

  const nextPage = () => {
    if (data?.hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (page > 0) {
      setPage(prev => prev - 1);
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 0) {
      setPage(pageNumber);
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    setPage(0);
    setAllPages([[]]);
  };

  return {
    data: data?.data || [],
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    page,
    nextPage,
    prevPage,
    goToPage,
    refetch,
    invalidate,
    pageSize,
  };
}
