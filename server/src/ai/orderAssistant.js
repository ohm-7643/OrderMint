/**
 * Local AI Assistant integration for OrderMint using Ollama.
 * AI acts as an assistant for ambiguous phrasing; deterministic code remains
 * the source of truth, and seller approval is always required.
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';
const TIMEOUT_MS = 6000;

export async function checkAIStatus() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(2500)
    });
    if (!res.ok) {
      return { available: false, error: `Ollama returned status ${res.status}` };
    }
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    const hasDefault = models.some(m => m.startsWith(DEFAULT_MODEL.split(':')[0]));

    return {
      available: true,
      host: OLLAMA_HOST,
      models,
      activeModel: hasDefault ? DEFAULT_MODEL : (models[0] || null)
    };
  } catch (err) {
    return {
      available: false,
      host: OLLAMA_HOST,
      error: err.name === 'TimeoutError' ? 'Connection timed out' : 'Ollama service unreachable'
    };
  }
}

export async function refineWithAI(rawText, catalogItems) {
  const status = await checkAIStatus();
  if (!status.available || !status.activeModel) {
    return {
      applied: false,
      reason: status.error || 'No active model available in Ollama',
      fallback: true
    };
  }

  const catalogNames = catalogItems.map(c => c.name);
  const prompt = `You are a strict data extraction parser. Do not think. Do not write explanation or thinking blocks. Output valid JSON only matching the schema below.

Allowed Catalog Items:
${JSON.stringify(catalogNames)}

Input text:
"${rawText}"

Schema:
{
  "catalog_item": string or null,
  "quantity": integer or null,
  "quoted_price": number or null,
  "evidence": string or null
}`;

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: status.activeModel,
        prompt,
        format: 'json',
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 120
        }
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });

    if (!res.ok) {
      return { applied: false, reason: `HTTP error ${res.status}`, fallback: true };
    }

    const data = await res.json();
    let parsed;
    try {
      parsed = JSON.parse(data.response);
    } catch {
      return { applied: false, reason: 'Model returned malformed JSON', fallback: true };
    }

    // Validate structured output
    if (!parsed || typeof parsed !== 'object') {
      return { applied: false, reason: 'Response is not an object', fallback: true };
    }

    // Strict catalog item match check
    let matchedItem = null;
    if (parsed.catalog_item) {
      matchedItem = catalogItems.find(
        c => c.name.toLowerCase() === String(parsed.catalog_item).toLowerCase()
      );
      if (!matchedItem) {
        return { applied: false, reason: 'Model suggested non-existent catalog item', fallback: true };
      }
    }

    // Validate quantity
    let validQty = null;
    if (Number.isInteger(parsed.quantity) && parsed.quantity > 0 && parsed.quantity <= 1000) {
      validQty = parsed.quantity;
    }

    // Validate evidence substring
    let evidence = parsed.evidence;
    if (evidence && !rawText.toLowerCase().includes(String(evidence).toLowerCase())) {
      evidence = null;
    }

    return {
      applied: true,
      model: status.activeModel,
      suggestion: {
        item_id: matchedItem ? matchedItem.id : null,
        item_name: matchedItem ? matchedItem.name : null,
        quantity: validQty,
        quoted_price: parsed.quoted_price || null,
        evidence: evidence || rawText
      }
    };
  } catch (err) {
    return {
      applied: false,
      reason: err.name === 'TimeoutError' ? 'AI request timed out' : err.message,
      fallback: true
    };
  }
}
