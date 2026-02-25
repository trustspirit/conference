import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

const sendPersonalCodeFn = httpsCallable(functions, 'sendPersonalCode')
const findCodeByEmailFn = httpsCallable(functions, 'findCodeByEmail')

export const sendPersonalCodeEmail = async (
  email: string,
  surveyId: string
): Promise<void> => {
  await sendPersonalCodeFn({ email, surveyId })
}

/** Send personal code to email — does NOT reveal whether the email is registered */
export const findCodeByEmail = async (email: string): Promise<void> => {
  await findCodeByEmailFn({ email })
}
