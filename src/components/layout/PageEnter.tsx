'use client'
import { usePageEnter } from '@/hooks/usePageEnter'

interface PageEnterProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function PageEnter({ children, className = '', delay = 80 }: PageEnterProps) {
  const entered = usePageEnter(delay)
  return (
    <div
      className={className}
      style={{
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 500ms ease, transform 500ms ease',
      }}
    >
      {children}
    </div>
  )
}
