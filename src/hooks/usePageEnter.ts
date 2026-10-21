'use client'
import { useEffect, useState } from 'react'

export function usePageEnter(delayMs = 80) {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), delayMs)
    return () => clearTimeout(t)
  }, [delayMs])
  return entered
}
