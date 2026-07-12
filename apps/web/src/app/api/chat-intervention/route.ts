import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSystemSettings } from '@/app/actions/settings';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, graphNodes } = body;

    if (!messages || !graphNodes) {
      return NextResponse.json({ error: "Riwayat percakapan atau data graf tidak ditemukan." }, { status: 400 });
    }

    const settings = await getSystemSettings();
    if (!settings.success || !settings.data?.gemini_api_key) {
      return NextResponse.json({ error: "Gemini API Key belum dikonfigurasi di Pengaturan." }, { status: 500 });
    }

    const apiKey = settings.data.gemini_api_key;
    
    // Map data to reduce token size
    const textData = graphNodes.map((node: any, index: number) => {
      let nodeStr = `[Node ${index + 1}] ID: ${node.id}, Tipe: ${node.type}, Label: ${node.label}`;
      if (node.data) {
        if (node.data.kondisi_awal) nodeStr += `\nKondisi Awal: ${node.data.kondisi_awal}`;
        if (node.data.upaya_dilakukan) nodeStr += `\nUpaya Dilakukan: ${node.data.upaya_dilakukan}`;
        if (node.data.perubahan_signifikan) nodeStr += `\nPerubahan Signifikan: ${node.data.perubahan_signifikan}`;
        if (node.data.alasan_bermakna) nodeStr += `\nAlasan Bermakna: ${node.data.alasan_bermakna}`;
        if (node.data.phase) nodeStr += `\nFase: ${node.data.phase}`;
        if (node.data.submitter_role) nodeStr += `\nDisubmit oleh role: ${node.data.submitter_role}`;
      }
      return nodeStr;
    }).join("\n---\n");

    // Format chat history
    const conversationHistory = messages.map((m: any) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n\n');

    const systemPrompt = `Kamu adalah asisten analis data pendidikan. Berikut adalah data node dari Knowledge Graph laporan intervensi: \n\n${textData}\n\nJawab pertanyaan user berdasarkan data ini secara analitis, ringkas, dan profesional. Mirip seperti notebook LM yang membaca dokumen dan node.`;

    const ai = new GoogleGenAI({ apiKey });
    
    // Call Interactions API to get a streaming response
    const stream = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: [
        { type: "text", text: systemPrompt },
        { type: "text", text: `Riwayat percakapan sejauh ini (jawab bagian paling terakhir saja dari User):\n\n${conversationHistory}` }
      ],
      stream: true
    });

    // Create a ReadableStream from the async iterable
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.event_type === 'step.delta') {
              const delta = event.delta as any;
              if (delta && delta.text) {
                controller.enqueue(new TextEncoder().encode(delta.text));
              }
            }
          }
        } catch (error) {
          console.error("Error generating stream:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    // Return stream response
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });

  } catch (err: any) {
    console.error("AI Chat API Error:", err);
    return NextResponse.json({ error: err.message || "Terjadi kesalahan internal." }, { status: 500 });
  }
}
