const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const readFileAsText = (accept: string = '.csv'): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error(`파일 크기가 너무 큽니다 (최대 10MB). 현재: ${(file.size / 1024 / 1024).toFixed(1)}MB`))
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}
