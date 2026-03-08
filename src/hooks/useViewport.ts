import { useState, useEffect } from 'react'

export interface ViewportInfo {
  width: number
  height: number
  isMobile: boolean   // < 768px
  isTablet: boolean   // 768–1024px
  isDesktop: boolean  // > 1024px
}

export function useViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280
    const h = typeof window !== 'undefined' ? window.innerHeight : 800
    return {
      width: w,
      height: h,
      isMobile: w < 768,
      isTablet: w >= 768 && w <= 1024,
      isDesktop: w > 1024,
    }
  })

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setViewport({
        width: w,
        height: h,
        isMobile: w < 768,
        isTablet: w >= 768 && w <= 1024,
        isDesktop: w > 1024,
      })
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return viewport
}
