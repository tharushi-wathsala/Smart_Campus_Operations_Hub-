/**
 * Campus-grade profanity and inappropriate content filter.
 * This utility helps maintain a professional environment within the Smart Campus Operations Hub.
 */

// A refined blacklist of inappropriate terms (vulgarity, slurs, suggestive language)
// In a large production environment, this would ideally be powered by an external API or a much larger dictionary.
const BANNED_TERMS = [
  // Common vulgar terms
  "fuck", "shit", "ass", "bitch", "crap", "damn", "piss", "dick", "pussy", "cock",
  // Suggestive/Inappropriate for campus
  "sex", "porn", "naked", "nude", "horny",
  // Slurs (Add others as per campus specific policies)
  "nigger", "faggot", "retard"
];

/**
 * Checks if the provided content contains any inappropriate language.
 * Uses word-boundary checks to prevent false positives (e.g., "Assistance" shouldn't trigger "Ass").
 * 
 * @param content The text to validate
 * @returns true if inappropriate language is detected, false otherwise
 */
export const isContentInappropriate = (content: string): boolean => {
  if (!content) return false;
  
  const normalizedContent = content.toLowerCase();
  
  return BANNED_TERMS.some(term => {
    // Create a regular expression with word boundaries (\b)
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    return regex.test(normalizedContent);
  });
};

/**
 * Clean/Sanitize logic if eventually needed (e.g., replacing with asterisks)
 */
export const sanitizeContent = (content: string): string => {
  if (!content) return content;
  
  let sanitized = content;
  BANNED_TERMS.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    sanitized = sanitized.replace(regex, "****");
  });
  
  return sanitized;
};
