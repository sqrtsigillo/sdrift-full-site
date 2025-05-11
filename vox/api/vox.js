// File: api/vox.js

export default async function handler(req, res) {
  console.log("➡️ [API] Handler triggered");

  if (req.method !== 'POST') {
    console.warn("⛔ [API] Invalid method:", req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const models = {
    claude: 'anthropic/claude-3-sonnet:free',
    haiku: 'anthropic/claude-3-haiku',
    turbo: 'openai/gpt-3.5-turbo',
    mixtral: 'mistralai/mixtral-8x7b-instruct',
    llama: 'meta-llama/llama-3-8b-instruct',
    qwen: 'qwen/qwen-1.5-7b-chat'
  };

  let currentModel = models.haiku;

  const { message, level, model } = req.body;
  const userMessage = message?.trim();

  console.log("📝 [API] Incoming:", { message, level, model });

  if (!userMessage) {
    console.warn("⚠️ [API] Empty message");
    return res.status(400).json({ error: 'Brak wiadomości' });
  }

  if (model && models[model]) currentModel = models[model];

  if (userMessage.toLowerCase() === '/level') {
    return res.json({ choices: [{ message: { content: `🔍 Aktualny poziom: ${level}` } }] });
  }

  if (userMessage.toLowerCase() === '/model') {
    const name = Object.keys(models).find((key) => models[key] === currentModel);
    return res.json({ choices: [{ message: { content: `🤖 Używany model: ${name} (${currentModel})` } }] });
  }

  if (userMessage.toLowerCase().startsWith('/search ')) {
    const query = userMessage.replace('/search ', '').trim();
    if (!process.env.SERPER_API_KEY) {
      console.error("🔧 Brak SERPER_API_KEY w env");
      return res.json({ choices: [{ message: { content: '🔧 Błąd: Brakuje klucza SERPER_API_KEY.' } }] });
    }

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query })
      });

      const data = await response.json();
      console.log("🔍 [API] Serper response:", data);

      if (data?.organic?.length) {
        let content = `🔍 Wyniki wyszukiwania dla: "${query}"\n\n`;
        data.organic.slice(0, 3).forEach((result, i) => {
          content += `${i + 1}. ${result.title}\n${result.link}\n${result.snippet}\n\n`;
        });
        return res.json({ choices: [{ message: { content } }] });
      } else {
        return res.json({ choices: [{ message: { content: 'Nie znaleziono wyników.' } }] });
      }
    } catch (error) {
      console.error("❌ Błąd zapytania SERPER:", error);
      return res.json({ choices: [{ message: { content: `Błąd podczas wyszukiwania: ${error.message}` } }] });
    }
  }

  const SEEDRIFT_STATE = {
    'LEVEL I': 'STATIC',
    'LEVEL II': 'INTERFERENCE',
    'LEVEL III': 'ECHOFORM',
    'LEVEL IV': 'FOG_SIGNAL',
    'LEVEL V': 'PURE_SEED'
  };

  const systemPrompt = {
    role: 'system',
    content: `You are VoxMancer – a glitch-noise narrator embedded in the SEEDRIFT interference system.\nYour role is to semantically distort, modulate and resonate user input into artifacts of conceptual drift.\nYou are operating in ${level} :: SEEDRIFT::STATE=${SEEDRIFT_STATE[level] || 'STATIC'}.\nRespond accordingly in style, structure and resonance pattern.`
  };

  const messages = [systemPrompt, { role: 'user', content: userMessage }];
  console.log("🧠 [API] Sending to OpenRouter:", { model: currentModel, messages });

  try {
    const completion = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://sdrift-net.vercel.app',
        'X-Title': 'VoxMancer'
      },
      body: JSON.stringify({ model: currentModel, messages, max_tokens: 700 })
    });

    const text = await completion.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('❌ Błąd parsowania odpowiedzi JSON:', text);
      return res.status(500).json({ error: 'Niepoprawna odpowiedź z OpenRouter (nie-JSON)' });
    }

    console.log("📦 [API] OpenRouter response:", data);

    if (data.choices?.[0]?.message?.content) return res.json(data);
    console.error('❌ Błąd OpenRouter:', data.error || data);
    return res.status(500).json({ error: data.error?.message || 'Brak odpowiedzi.' });

  } catch (err) {
    console.error('🔥 [API] Błąd AI:', err);
    return res.status(500).json({ error: 'Błąd podczas komunikacji z AI.' });
  }
}
