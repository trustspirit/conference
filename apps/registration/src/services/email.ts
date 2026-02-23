import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

const sendPersonalCodeFn = httpsCallable(functions, 'sendPersonalCode')

export const sendPersonalCodeEmail = async (
  email: string,
  surveyId: string
): Promise<void> => {
  await sendPersonalCodeFn({ email, surveyId })
}
