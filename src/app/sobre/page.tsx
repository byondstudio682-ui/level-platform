import { TopNav } from '@/components/layout/TopNav'
import Image from 'next/image'

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-black">
      <TopNav />
      <main className="pt-14 p-8 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Sobre</h1>
          <p className="text-white/30 text-sm mt-0.5">Victor Stuck — Level Studio</p>
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <Image src="/sobre/parte-1.jpg" alt="" width={2562} height={5840} className="w-full h-auto" priority quality={100} />
            <Image src="/sobre/parte-2.jpg" alt="" width={2562} height={5840} className="w-full h-auto" quality={100} />
            <Image src="/sobre/parte-3.jpg" alt="" width={2562} height={5840} className="w-full h-auto" quality={100} />
            <Image src="/sobre/parte-4.jpg" alt="" width={2562} height={5841} className="w-full h-auto" quality={100} />
          </div>
        </div>
      </main>
    </div>
  )
}
