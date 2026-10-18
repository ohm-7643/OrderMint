/**
 * Extracts delivery hints and special requests from messages.
 * Only captures explicit information present in the text.
 */
export function extractDeliveryAndNotes(text) {
  if (!text) return { deliveryNote: null, itemNote: null };

  const deliveryParts = [];
  const noteParts = [];

  // Date and timing matches: "for sat", "by 5pm", "for tomorrow", "today evening"
  const timeMatch = text.match(/\b(?:for|by|at|on)\s+(?:saturday|sunday|monday|tuesday|wednesday|thursday|friday|sat|sun|mon|tue|wed|thu|fri|tomorrow|today|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
  if (timeMatch) {
    deliveryParts.push(timeMatch[0].trim());
  }

  // Address or delivery mode: "deliver to ...", "pickup"
  const deliverToMatch = text.match(/\b(?:deliver\s+to|delivery\s+to|address:?)\s+([^,.]+)/i);
  if (deliverToMatch) {
    deliveryParts.push(deliverToMatch[0].trim());
  } else if (/\bpickup\b/i.test(text)) {
    deliveryParts.push('Pickup');
  }

  // Item customization notes: "eggless", "write happy birthday ...", "no onions", "extra spicy"
  if (/\beggless\b/i.test(text)) {
    noteParts.push('Eggless');
  }
  const customMsgMatch = text.match(/\b(?:write|message:?)\s+["']?([^"']+)["']?/i);
  if (customMsgMatch) {
    noteParts.push(`Message: "${customMsgMatch[1].trim()}"`);
  }
  if (/\b(?:no\s+nuts|nut\s+free|gluten\s+free|jain)\b/i.test(text)) {
    const dietMatch = text.match(/\b(?:no\s+nuts|nut\s+free|gluten\s+free|jain)\b/i);
    noteParts.push(dietMatch[0].trim());
  }

  return {
    deliveryNote: deliveryParts.length > 0 ? deliveryParts.join(', ') : null,
    itemNote: noteParts.length > 0 ? noteParts.join(', ') : null
  };
}
