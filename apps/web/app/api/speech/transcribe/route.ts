import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Check admin_settings table first, then fall back to env var
    let apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      const { data: setting } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'GROQ_API_KEY')
        .single();
      if (setting?.value) apiKey = setting.value;
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Speech transcription is not configured. Set GROQ_API_KEY in admin settings or env.' }, { status: 500 });
    }

    const whisperForm = new FormData();
    whisperForm.append('file', audioFile, 'audio.webm');
    whisperForm.append('model', 'whisper-large-v3-turbo');
    whisperForm.append('language', 'en');
    whisperForm.append('response_format', 'verbose_json');
    whisperForm.append('temperature', '0');
    whisperForm.append('prompt', 'This is a spoken college football take or discussion post. The speaker is sharing their opinion.');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq Whisper error:', response.status, err);
      return NextResponse.json({ error: `Transcription error (${response.status})` }, { status: 502 });
    }

    const result = await response.json();

    if (result.segments?.length) {
      const voiced = result.segments.filter((s: any) => (s.no_speech_prob ?? 0) < 0.7);
      const text = voiced.map((s: any) => s.text?.trim()).filter(Boolean).join(' ');
      return NextResponse.json({ text });
    }

    return NextResponse.json({ text: result.text ?? '' });
  } catch (error: any) {
    console.error('Transcribe error:', error?.message ?? error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
