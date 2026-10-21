import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getUserFromCookie(req: NextRequest) {
  const cookie = req.cookies.get('byond_user')
  if (!cookie) return null
  try {
    return JSON.parse(Buffer.from(cookie.value, 'base64').toString('utf8'))
  } catch { return null }
}

async function getGeminiKey(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_integrations')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'gemini_api_key')
    .single()
  return data?.value || null
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromCookie(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const formData = await req.formData()
    const audio = formData.get('audio') as File
    if (!audio) return NextResponse.json({ error: 'Áudio não recebido' }, { status: 400 })

    const geminiKey = await getGeminiKey(user.id)
    if (!geminiKey) {
      return NextResponse.json({ error: 'Chave Gemini não configurada. Acesse Conectar → Gemini IA.' })
    }

    // Converte áudio para base64
    const arrayBuffer = await audio.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = audio.type || 'audio/webm'

    // Envia para Gemini com o áudio inline
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Audio,
                }
              },
              { text: 'Transcreva exatamente o que foi dito neste áudio em português do Brasil. Retorne apenas o texto transcrito, sem comentários.' }
            ]
          }]
        }),
      }
    )

    const data = await res.json()
    if (!res.ok) {
      console.error('Gemini transcribe error:', data)
      return NextResponse.json({ error: 'Erro ao transcrever com Gemini' }, { status: 500 })
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return NextResponse.json({ text: text.trim() })

  } catch (err) {
    console.error('Transcribe error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
