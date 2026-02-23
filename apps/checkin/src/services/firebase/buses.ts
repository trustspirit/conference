import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
  increment,
  writeBatch
} from 'firebase/firestore'
import { db, convertTimestamp, Timestamp } from '@conference/firebase'
import type { BusRoute } from '../../types'

export const BUSES_COLLECTION = 'buses'

// Convert Firestore document to BusRoute
const convertToBusRoute = (id: string, data: Record<string, unknown>): BusRoute => ({
  id,
  name: data.name as string,
  region: data.region as string,
  departureLocation: data.departureLocation as string | undefined,
  estimatedArrivalTime: data.estimatedArrivalTime as string | undefined,
  contactName: data.contactName as string | undefined,
  contactPhone: data.contactPhone as string | undefined,
  notes: data.notes as string | undefined,
  participantCount: (data.participantCount as number) || 0,
  arrivedAt: data.arrivedAt ? convertTimestamp(data.arrivedAt as Timestamp | Date | undefined) : undefined,
  createdAt: convertTimestamp(data.createdAt as Timestamp | Date | undefined),
  updatedAt: convertTimestamp(data.updatedAt as Timestamp | Date | undefined)
})

// Get all bus routes
export async function getAllBusRoutes(): Promise<BusRoute[]> {

  const busesRef = collection(db, BUSES_COLLECTION)
  // Use simple query to avoid composite index requirement
  const q = query(busesRef, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  const buses = snapshot.docs.map((doc) => convertToBusRoute(doc.id, doc.data()))
  // Sort client-side by region then name
  return buses.sort((a, b) => {
    const regionCompare = a.region.localeCompare(b.region)
    if (regionCompare !== 0) return regionCompare
    return a.name.localeCompare(b.name)
  })
}

// Get bus routes by region
export async function getBusRoutesByRegion(region: string): Promise<BusRoute[]> {

  const busesRef = collection(db, BUSES_COLLECTION)
  // Simple query without composite index
  const q = query(busesRef, where('region', '==', region))
  const snapshot = await getDocs(q)
  const buses = snapshot.docs.map((doc) => convertToBusRoute(doc.id, doc.data()))
  // Sort client-side by name
  return buses.sort((a, b) => a.name.localeCompare(b.name))
}

// Get bus route by ID
export async function getBusRouteById(id: string): Promise<BusRoute | null> {

  const busRef = doc(db, BUSES_COLLECTION, id)
  const snapshot = await getDoc(busRef)
  if (!snapshot.exists()) return null
  return convertToBusRoute(snapshot.id, snapshot.data())
}

// Create or get bus route options
export interface CreateBusRouteOptions {
  name: string
  region: string
  departureLocation?: string
  estimatedArrivalTime?: string
  contactName?: string
  contactPhone?: string
  notes?: string
}

// Create or get bus route
export async function createOrGetBusRoute(options: CreateBusRouteOptions): Promise<BusRoute> {

  const busesRef = collection(db, BUSES_COLLECTION)

  // Check if bus with same name exists
  const q = query(busesRef, where('name', '==', options.name))
  const snapshot = await getDocs(q)

  if (!snapshot.empty) {
    const existingDoc = snapshot.docs[0]
    return convertToBusRoute(existingDoc.id, existingDoc.data())
  }

  // Create new bus route
  const newBusRef = doc(busesRef)
  const now = new Date()
  const busData = {
    name: options.name,
    region: options.region,
    departureLocation: options.departureLocation || null,
    estimatedArrivalTime: options.estimatedArrivalTime || null,
    contactName: options.contactName || null,
    contactPhone: options.contactPhone || null,
    notes: options.notes || null,
    participantCount: 0,
    createdAt: now,
    updatedAt: now
  }

  await setDoc(newBusRef, busData)

  return {
    id: newBusRef.id,
    ...options,
    participantCount: 0,
    createdAt: now,
    updatedAt: now
  }
}

// Update bus route data
export interface UpdateBusRouteData {
  name?: string
  region?: string
  departureLocation?: string
  estimatedArrivalTime?: string
  contactName?: string
  contactPhone?: string
  notes?: string
  arrivedAt?: Date | null
}

export async function updateBusRoute(id: string, data: UpdateBusRouteData): Promise<void> {

  const busRef = doc(db, BUSES_COLLECTION, id)

  const updateData: Record<string, unknown> = {
    updatedAt: new Date()
  }

  if (data.name !== undefined) updateData.name = data.name
  if (data.region !== undefined) updateData.region = data.region
  if (data.departureLocation !== undefined)
    updateData.departureLocation = data.departureLocation || null
  if (data.estimatedArrivalTime !== undefined)
    updateData.estimatedArrivalTime = data.estimatedArrivalTime || null
  if (data.contactName !== undefined) updateData.contactName = data.contactName || null
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone || null
  if (data.notes !== undefined) updateData.notes = data.notes || null
  if (data.arrivedAt !== undefined) updateData.arrivedAt = data.arrivedAt

  await updateDoc(busRef, updateData)
}

// Mark bus as arrived
export async function markBusAsArrived(id: string): Promise<void> {

  const busRef = doc(db, BUSES_COLLECTION, id)
  await updateDoc(busRef, {
    arrivedAt: new Date(),
    updatedAt: new Date()
  })
}

// Cancel bus arrival
export async function cancelBusArrival(id: string): Promise<void> {

  const busRef = doc(db, BUSES_COLLECTION, id)
  await updateDoc(busRef, {
    arrivedAt: null,
    updatedAt: new Date()
  })
}

// Delete bus route
export async function deleteBusRoute(id: string): Promise<void> {

  const busRef = doc(db, BUSES_COLLECTION, id)

  // First, unassign all participants from this bus
  const participantsRef = collection(db, 'participants')
  const q = query(participantsRef, where('busId', '==', id))
  const snapshot = await getDocs(q)

  const batch = writeBatch(db)

  snapshot.docs.forEach((participantDoc) => {
    batch.update(participantDoc.ref, {
      busId: null,
      busName: null,
      updatedAt: new Date()
    })
  })

  batch.delete(busRef)
  await batch.commit()
}

// Assign participant to bus
export async function assignParticipantToBus(
  participantId: string,
  busId: string,
  busName: string
): Promise<void> {

  const participantRef = doc(db, 'participants', participantId)
  const participantSnap = await getDoc(participantRef)

  if (!participantSnap.exists()) {
    throw new Error('Participant not found')
  }

  const currentBusId = participantSnap.data().busId

  const batch = writeBatch(db)

  // Decrement old bus count if exists
  if (currentBusId && currentBusId !== busId) {
    const oldBusRef = doc(db, BUSES_COLLECTION, currentBusId)
    batch.update(oldBusRef, {
      participantCount: increment(-1),
      updatedAt: new Date()
    })
  }

  // Update participant
  batch.update(participantRef, {
    busId,
    busName,
    updatedAt: new Date()
  })

  // Increment new bus count if not already assigned to this bus
  if (currentBusId !== busId) {
    const newBusRef = doc(db, BUSES_COLLECTION, busId)
    batch.update(newBusRef, {
      participantCount: increment(1),
      updatedAt: new Date()
    })
  }

  await batch.commit()
}

// Remove participant from bus
export async function removeParticipantFromBus(participantId: string): Promise<void> {

  const participantRef = doc(db, 'participants', participantId)
  const participantSnap = await getDoc(participantRef)

  if (!participantSnap.exists()) {
    throw new Error('Participant not found')
  }

  const currentBusId = participantSnap.data().busId

  if (!currentBusId) return

  const batch = writeBatch(db)

  // Decrement bus count
  const busRef = doc(db, BUSES_COLLECTION, currentBusId)
  batch.update(busRef, {
    participantCount: increment(-1),
    updatedAt: new Date()
  })

  // Update participant
  batch.update(participantRef, {
    busId: null,
    busName: null,
    updatedAt: new Date()
  })

  await batch.commit()
}

// Get all unique regions
export async function getAllRegions(): Promise<string[]> {
  const buses = await getAllBusRoutes()
  const regions = [...new Set(buses.map((b) => b.region))]
  return regions.sort()
}

// Move multiple participants to a bus
export async function moveParticipantsToBus(
  participantIds: string[],
  busId: string,
  busName: string
): Promise<void> {

  const batch = writeBatch(db)

  // Track bus count changes
  const busCountChanges: Record<string, number> = {}

  for (const participantId of participantIds) {
    const participantRef = doc(db, 'participants', participantId)
    const participantSnap = await getDoc(participantRef)

    if (!participantSnap.exists()) continue

    const currentBusId = participantSnap.data().busId

    // Decrement old bus count
    if (currentBusId && currentBusId !== busId) {
      busCountChanges[currentBusId] = (busCountChanges[currentBusId] || 0) - 1
    }

    // Increment new bus count
    if (currentBusId !== busId) {
      busCountChanges[busId] = (busCountChanges[busId] || 0) + 1
    }

    batch.update(participantRef, {
      busId,
      busName,
      updatedAt: new Date()
    })
  }

  // Apply bus count changes
  for (const [id, change] of Object.entries(busCountChanges)) {
    const busRef = doc(db, BUSES_COLLECTION, id)
    batch.update(busRef, {
      participantCount: increment(change),
      updatedAt: new Date()
    })
  }

  await batch.commit()
}
