let loadPromise: Promise<typeof kakao.maps> | null = null

export function loadKakaoSDK(): Promise<typeof kakao.maps> {
  if (loadPromise) return loadPromise

  const apiKey = import.meta.env.VITE_KAKAO_JS_KEY
  if (!apiKey) {
    loadPromise = Promise.reject(new Error('VITE_KAKAO_JS_KEY is not set'))
    return loadPromise
  }

  // Already loaded (e.g. from a previous page)
  if (window.kakao?.maps?.services) {
    loadPromise = Promise.resolve(window.kakao.maps)
    return loadPromise
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`
    script.async = true
    script.onload = () => {
      window.kakao.maps.load(() => {
        resolve(window.kakao.maps)
      })
    }
    script.onerror = () => {
      loadPromise = null // allow retry
      reject(new Error('Failed to load Kakao Maps SDK'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}
