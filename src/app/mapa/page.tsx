'use client'
import { MarkmapView } from '@/components/mindmap/MarkmapView'
import { TopNav } from '@/components/layout/TopNav'

export default function MapaPage() {
  return (
    <div className="min-h-screen bg-black">
      <TopNav />
      <main className="pt-14 p-8 h-screen overflow-hidden flex flex-col">
        <MarkmapView />
      </main>
    </div>
  )
}
