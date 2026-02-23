import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { app } from './firebase'

const storage = getStorage(app)

export const uploadHeaderImage = async (
  surveyId: string,
  file: File
): Promise<string> => {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `surveys/${surveyId}/header.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, { contentType: file.type })
  return getDownloadURL(storageRef)
}
