'use strict';

const { encode } = require('gpt-tokenizer');

/**
 * Token counting using OpenAI's cl100k encoding via the `gpt-tokenizer`
 * package. Other providers (DeepSeek, Anthropic, custom) use different
 * tokenizers, so every token figure derived from this is labelled
 * "ESTIMATED" in the UI. Falls back to a chars/4 heuristic on error.
 */
function countTokens(text) {
  if (!text) return 0;
  try {
    return encode(String(text)).length;
  } catch (err) {
    return Math.ceil(String(text).length / 4);
  }
}

module.exports = { countTokens };
