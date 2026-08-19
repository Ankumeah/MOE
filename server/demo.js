'use strict';

/**
 * Demo mode answer generator. Produces clearly-labelled simulated responses
 * so the full pipeline (question → router → expert → answer → metrics) works
 * without any API key. Every demo answer states that it is simulated.
 */

const TEMPLATES = {
  mathematics:
    '**Mathematics Expert — demo response (simulated)**\n\n' +
    'You asked: "{{question}}"\n\n' +
    'A mathematics expert would start by classifying the problem (algebraic, geometric, statistical, …), ' +
    'translate it into precise notation, then apply the appropriate technique step by step.\n\n' +
    'The typical workflow: define the variables, state the governing identity or theorem, work through the ' +
    'algebra or computation in stages, then finish with a clearly labelled final answer — checking units, ' +
    'signs and edge cases along the way.\n\n' +
    'Configure a real provider in **Settings** to receive a fully worked solution.',

  physics:
    '**Physics Expert — demo response (simulated)**\n\n' +
    'You asked: "{{question}}"\n\n' +
    'A physics expert would first identify the governing principle — Newton\u2019s laws, conservation of energy, ' +
    'electrodynamics, waves, or thermodynamics — then list the knowns and unknowns and apply the relevant equations.\n\n' +
    'The final step is a sanity check of units and the magnitude of the result, which is where many subtle ' +
    'physics errors are caught.\n\n' +
    'Configure a real provider in **Settings** for a detailed physical derivation.',

  chemistry:
    '**Chemistry Expert — demo response (simulated)**\n\n' +
    'You asked: "{{question}}"\n\n' +
    'A chemistry expert would identify the substances and the reaction involved, balance any chemical equation, ' +
    'and apply stoichiometry or reaction thermodynamics as needed — then connect the result back to the ' +
    'observable properties of matter.\n\n' +
    'Attention to units (moles, molarity, concentrations) and reaction conditions (temperature, pressure, catalyst) ' +
    'is the core of the discipline.\n\n' +
    'Configure a real provider in **Settings** for a step-by-step chemical explanation.',

  biology:
    '**Biology Expert — demo response (simulated)**\n\n' +
    'You asked: "{{question}}"\n\n' +
    'A biology expert would frame the answer in terms of structure and function, working from molecules and ' +
    'cells up to organisms and ecosystems, and explain the underlying mechanism rather than just the outcome.\n\n' +
    'Key organising ideas include cell theory, genetics and natural selection, homeostasis, and ecological ' +
    'interactions.\n\n' +
    'Configure a real provider in **Settings** for a deeper biological answer.',

  history:
    '**History Expert — demo response (simulated)**\n\n' +
    'You asked: "{{question}}"\n\n' +
    'A history expert would place the topic in its chronological and geographic context, draw on primary sources ' +
    'where possible, and present the competing interpretations historians debate — distinguishing well-established ' +
    'facts from areas of scholarly disagreement.\n\n' +
    'Periodisation, causation and the limits of the surviving evidence are always central.\n\n' +
    'Configure a real provider in **Settings** for a fuller historical account.',

  coding:
    '**Coding Expert — demo response (simulated)**\n\n' +
    'You asked: "{{question}}"\n\n' +
    'A coding expert would analyse the problem, choose appropriate data structures and an algorithm with the right ' +
    'complexity, sketch the design, and then write clean, testable code — handling edge cases and errors explicitly.\n\n' +
    'The answer would typically include a short code sample plus notes on why that approach was chosen.\n\n' +
    'Configure a real provider in **Settings** to receive actual working code.',

  language:
    '**Language Expert — demo response (simulated)**\n\n' +
    'You asked: "{{question}}"\n\n' +
    'A language expert would consider grammar, vocabulary, style, register and the intended audience, then either ' +
    'explain the linguistic point or rewrite the text with clarity and precision.\n\n' +
    'The explanation would come with concrete examples showing the rule or usage in context.\n\n' +
    'Configure a real provider in **Settings** for a detailed linguistic analysis.',

  general:
    '**General Expert — demo response (simulated)**\n\n' +
    'You asked: "{{question}}"\n\n' +
    'This question did not strongly match a specialist expert, so it was routed to the General expert. A generalist ' +
    'would draw on broad knowledge across many fields, structure the answer clearly, and explicitly flag any ' +
    'uncertainty.\n\n' +
    'If your question is about a specific subject, try rephrasing it with a domain keyword (e.g. "physics", "python", ' +
    '"grammar") and it may route to the specialist expert.\n\n' +
    'Configure a real provider in **Settings** for a real response.',
};

function demoAnswer(expertId, question) {
  const template = TEMPLATES[expertId] || TEMPLATES.general;
  return template.replace('{{question}}', question);
}

module.exports = { demoAnswer };
