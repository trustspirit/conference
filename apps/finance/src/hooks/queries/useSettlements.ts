import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { db } from '@conference/firebase';
import { queryKeys } from "./queryKeys";
import type { Settlement, Committee, PaymentRequest, AppUser } from "../../types";

const PAGE_SIZE = 20;

export function useSettlements(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.settlements.all(projectId!),
    queryFn: async () => {
      const q = query(
        collection(db, "settlements"),
        where("projectId", "==", projectId),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Settlement);
    },
    enabled: !!projectId,
  });
}

export function useInfiniteSettlements(projectId: string | undefined, committee?: Committee) {
  return useInfiniteQuery({
    queryKey: queryKeys.settlements.infinite(projectId!, committee),
    queryFn: async ({ pageParam }) => {
      const constraints: QueryConstraint[] = [
        where("projectId", "==", projectId),
        orderBy("createdAt", "desc"),
      ];
      if (committee) constraints.push(where("committee", "==", committee));
      if (pageParam) constraints.push(startAfter(pageParam));
      constraints.push(limit(PAGE_SIZE));

      const q = query(collection(db, "settlements"), ...constraints);
      const snap = await getDocs(q);
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Settlement,
      );
      return { items, lastDoc: snap.docs[snap.docs.length - 1] ?? null };
    },
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    getNextPageParam: (lastPage) =>
      lastPage.items.length < PAGE_SIZE ? undefined : lastPage.lastDoc,
    placeholderData: keepPreviousData,
    enabled: !!projectId,
  });
}

export function useSettlement(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.settlements.detail(id!),
    queryFn: async () => {
      const snap = await getDoc(doc(db, "settlements", id!));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Settlement;
    },
    enabled: !!id,
  });
}

export function useSettlementBatch(batchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.settlements.batch(batchId!),
    queryFn: async () => {
      const q = query(
        collection(db, "settlements"),
        where("batchId", "==", batchId),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Settlement);
    },
    enabled: !!batchId,
  });
}

/** Load original requests by IDs (for settlement report individual forms) */
export function useRequestsByIds(requestIds: string[]) {
  return useQuery({
    queryKey: ['requests', 'byIds', ...requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return []
      const results = await Promise.all(
        requestIds.map(async (id) => {
          const snap = await getDoc(doc(db, 'requests', id))
          if (!snap.exists()) return null
          return { id: snap.id, ...snap.data() } as PaymentRequest
        })
      )
      return results.filter((r): r is PaymentRequest => r !== null)
    },
    enabled: requestIds.length > 0,
  });
}

/** Load user profiles by UIDs (for bank book URLs in settlement reports) */
export function useUsersByUids(uids: string[]) {
  const uniqueUids = [...new Set(uids)].sort()
  return useQuery({
    queryKey: ['users', 'byUids', ...uniqueUids],
    queryFn: async () => {
      const map = new Map<string, AppUser>()
      await Promise.all(
        uniqueUids.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, 'users', uid))
            if (snap.exists()) map.set(uid, { uid, ...snap.data() } as AppUser)
          } catch { /* skip */ }
        })
      )
      return map
    },
    enabled: uniqueUids.length > 0,
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      settlements: Array<Omit<Settlement, "id" | "createdAt">>;
    }) => {
      const batch = writeBatch(db);

      for (const settlement of params.settlements) {
        const settlementRef = doc(collection(db, "settlements"));
        batch.set(settlementRef, {
          ...settlement,
          createdAt: serverTimestamp(),
        });

        for (const requestId of settlement.requestIds) {
          batch.update(doc(db, "requests", requestId), {
            status: "settled",
            settlementId: settlementRef.id,
          });
        }
      }

      await batch.commit();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.requests.all(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlements.all(variables.projectId),
      });
    },
  });
}
