export { app, db, convertTimestamp, Timestamp } from '@conference/firebase'
export { auth, signInWithGoogle, signOut, onAuthChange } from '@conference/firebase'
export type { User } from '@conference/firebase'

// App-specific collection names
export {
  PARTICIPANTS_COLLECTION,
  GROUPS_COLLECTION,
  ROOMS_COLLECTION,
  USERS_COLLECTION,
  SCHEDULES_COLLECTION
} from './collections'

// Backward-compatible helpers
import { db } from '@conference/firebase'
export const getDb = () => db
export const isFirebaseConfigured = (): boolean => {
  return !!import.meta.env.VITE_FIREBASE_PROJECT_ID
}

// Participant Services
export {
  searchParticipants,
  getParticipantById,
  getAllParticipants,
  getParticipantsPaginated,
  searchParticipantsPaginated,
  addParticipant,
  updateParticipant,
  checkInParticipant,
  checkOutParticipant,
  moveParticipantsToRoom,
  moveParticipantsToGroup,
  removeParticipantFromGroup,
  removeParticipantFromRoom
} from './participants'
export type {
  PaginatedResult,
  ParticipantFilters,
  CreateParticipantData,
  UpdateParticipantData
} from './participants'

// Group Services
export {
  getAllGroups,
  getGroupById,
  createOrGetGroup,
  assignParticipantToGroup,
  updateGroup,
  deleteGroup,
  getGroupsPaginated
} from './groups'
export type { CreateGroupOptions, UpdateGroupData } from './groups'

// Room Services
export {
  getAllRooms,
  getRoomById,
  createOrGetRoom,
  assignParticipantToRoom,
  updateRoom,
  deleteRoom,
  getRoomsPaginated
} from './rooms'
export type { CreateRoomOptions, UpdateRoomData } from './rooms'

// Real-time Subscriptions
export { subscribeToParticipants, subscribeToGroups, subscribeToRooms } from './subscriptions'
export type { DataListener } from './subscriptions'

// Batched Pagination
export { getParticipantsPaginatedForHook } from './participantsPagination'

// CSV Import
export { importParticipantsFromCSV } from './csvImport'

// Data Reset
export { resetAllData } from './dataReset'
export type { ResetResult } from './dataReset'

// Users
export { fetchUsers, saveUser, removeUser, subscribeToUsers } from './users'
export type { AppUser } from './users'

// Bus Routes
export {
  getAllBusRoutes,
  getBusRoutesByRegion,
  getBusRouteById,
  createOrGetBusRoute,
  updateBusRoute,
  deleteBusRoute,
  assignParticipantToBus,
  removeParticipantFromBus,
  getAllRegions,
  moveParticipantsToBus,
  markBusAsArrived,
  cancelBusArrival,
  BUSES_COLLECTION
} from './buses'
export type { CreateBusRouteOptions, UpdateBusRouteData } from './buses'

// Schedule Services
export {
  getAllSchedules,
  getSchedulesByDateRange,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  subscribeToSchedules
} from './schedules'
export type { CreateScheduleData, UpdateScheduleData } from './schedules'
