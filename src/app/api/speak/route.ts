import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'Texto vazio' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key não configurada' }, { status: 500 })
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.slice(0, 4096), // limite da API
        voice: 'onyx', // voz mais grave/masculina — estilo Jarvis
        speed: 1.0,
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      const msg = data?.error?.message || 'Erro no TTS'
      if (msg.includes('credits') || msg.includes('billing')) {
        return NextResponse.json({ error: 'sem_credito' }, { status: 402 })
      }
      return NextResponse.json({ error: msg }, { status: response.status })
    }

    // Retorna o áudio mp3 direto
    const audioBuffer = await response.arrayBuffer()
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })
  } catch (err) {
    console.error('Speak error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
