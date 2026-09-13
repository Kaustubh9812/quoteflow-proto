import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { inquiry } = await request.json();

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry text is completely empty' }, { status: 400 });
    }

    console.log("--> Backend route triggered! Sending text to local Ollama server...");

    // Fetch call directly to the background service port
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3.2",
        messages: [
          {
            role: "system",
            content: "You are an expert operations assistant for a professional cleaning company. Analyze the customer inquiry and extract key details."
          },
          {
            role: "user",
            content: inquiry
          }
        ],
        stream: false
      })
    });

    console.log("--> Ollama responded with status code:", response.status);

    const rawText = await response.text();

    if (!response.ok) {
      console.error("--> Ollama returned a bad status code text:", rawText);
      return NextResponse.json({ error: `Ollama status error (${response.status}): ${rawText}` }, { status: 500 });
    }

    try {
      const data = JSON.parse(rawText);
      const resultText = data.message?.content || 'No text response generated.';
      return NextResponse.json({ result: resultText });
    } catch (parseError) {
      console.error("--> Failed to parse Ollama text as JSON. Raw text was:", rawText);
      return NextResponse.json({ error: `Ollama sent non-JSON text: ${rawText.substring(0, 100)}` }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('--> CRITICAL BACKEND EXCEPTION:', error);
    return NextResponse.json({ 
      error: `Internal server connect error: ${error.message || 'Check your VS Code terminal log!'}` 
    }, { status: 500 });
  }
}