export { app, db, functions, convertTimestamp, Timestamp } from '@conference/firebase'
export { auth, signInWithGoogle, signOut, onAuthChange } from '@conference/firebase'
export type { User } from '@conference/firebase'

// App-specific collection names
export const SURVEYS_COLLECTION = 'surveys'
export const SURVEY_RESPONSES_COLLECTION = 'survey_responses'
export const PARTICIPANTS_COLLECTION = 'participants'
