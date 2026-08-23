/**
 * Chat assistants wrap JSON in markdown, split it across code fences and inject UI text
 * such as "Use code with caution." mid-array. This recovers the object from that noise.
 */

function stripChatArtifacts(text: string): string {
  return text
    .replace(/use code with caution\.?/gi, '')
    // A language label glued to a markdown link close, e.g. "](url)json".
    .replace(/\)json\b/gi, ')')
    .replace(/```+[ \t]*(?:json|javascript|js)?/gi, '')
    .replace(/^[ \t]*(?:json|javascript|js)[ \t]*$/gim, '')
    // Excluding brackets from the link text stops this eating a JSON array's own opening bracket.
    .replace(/\[([^[\]]*)\]\((https?:\/\/[^)]+)\)/g, '$2')
    .replace(/^[ \t]*(?:json|javascript|js)[ \t]*$/gim, '')
    .replace(/\u00a0/g, ' ');
}

// Newlines inside a string literal are illegal JSON, so they are folded away rather than rejected.
function repairMultilineStrings(text: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    if (inString && (char === '\n' || char === '\r' || char === '\t')) {
      continue;
    }
    result += char;
  }
  return result;
}

function extractJsonBlock(text: string): string {
  const objectStart = text.indexOf('{');
  const arrayStart = text.indexOf('[');
  const useArray = arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart);
  const start = useArray ? arrayStart : objectStart;
  const end = useArray ? text.lastIndexOf(']') : text.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object was found in the pasted text.');
  }
  return text.slice(start, end + 1);
}

export function parseAiJson(raw: string): any {
  const cleaned = stripChatArtifacts(String(raw || ''));

  const attempts = [
    () => JSON.parse(extractJsonBlock(cleaned)),
    () => JSON.parse(repairMultilineStrings(extractJsonBlock(cleaned))),
    () => JSON.parse(repairMultilineStrings(extractJsonBlock(cleaned)).replace(/,\s*([}\]])/g, '$1')),
  ];

  for (const attempt of attempts) {
    try {
      const parsed = attempt();
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // Try the next repair strategy.
    }
  }

  throw new Error('That is not valid JSON. Paste the AI response again, or remove any text before and after the JSON.');
}
