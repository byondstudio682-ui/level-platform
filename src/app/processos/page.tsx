'use client'
import { MarkmapView } from '@/components/mindmap/MarkmapView'
import { TopNav } from '@/components/layout/TopNav'
import { PageEnter } from '@/components/layout/PageEnter'

export default function ProcessosPage() {
  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <main className="pt-14 p-8 h-screen overflow-hidden flex flex-col">
        <PageEnter className="flex flex-col flex-1 min-h-0">
          <MarkmapView />
        </PageEnter>
      </main>
    </div>
  )
}
