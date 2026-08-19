'use strict';

/**
 * The MoE expert catalogue.
 *
 * Each expert carries a system prompt (the "task" that would be loaded into
 * that expert's parameters) and a set of routing keywords with weights that
 * drive the (offline) router. This is a simplified educational representation
 * of sparse MoE — not a reproduction of any real system's architecture.
 */

const EXPERTS = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    subject: 'Mathematics',
    color: '#6366f1',
    icon: '∑',
    description: 'Algebra, calculus, geometry, trigonometry, statistics and number theory.',
    systemPrompt:
      'You are the Mathematics Expert inside a Mixture-of-Experts AI system. You specialise in pure and applied mathematics: algebra, calculus, geometry, trigonometry, statistics, probability, number theory and mathematical reasoning. Always show your working step by step, state any assumptions you make, and finish with the final answer clearly labelled.',
    keywords: {
      mathematics: 3, math: 3, maths: 3, algebra: 3, calculus: 3, geometry: 3,
      trigonometry: 2, 'trigonometric': 2, integral: 3, derivative: 3, differential: 2,
      equation: 2, 'linear equation': 3, quadratic: 3, 'quadratic formula': 3,
      'differential equation': 3, probability: 2, statistics: 2, statistical: 2,
      'prime number': 3, 'number theory': 3, matrix: 2, matrices: 2, vector: 2,
      fraction: 2, percentage: 2, logarithm: 2, exponent: 2, pythagoras: 3,
      fibonacci: 3, 'standard deviation': 3,       'solve': 1, formula: 1, calculate: 1,
      compute: 1, 'sum of': 2, factor: 2,
      'plus': 2, 'minus': 2, 'times': 2, 'divided by': 3, 'multiplied by': 3,
      'square root': 3, 'squared': 2, 'cubed': 2, 'raised to': 2,
      'evaluate': 2,
      'arithmetic': 3, 'add': 1, 'subtract': 2, 'multiply': 2, 'divide': 2,
      ' lcm': 2, ' gcf': 2, ' hcf': 2, ' remainder': 2, 'modulus': 2,
      'absolute value': 3, 'average': 1, 'mean': 1, 'median': 2, 'mode': 1,
      'ratio': 2, 'proportion': 2, 'integer': 2, 'natural number': 3,
      'real number': 2, 'imaginary': 2, 'complex number': 3,
      'factorial': 3, 'permutation': 3, 'combination': 3,
      'slope': 2, 'intercept': 2, 'coordinate': 2, 'distance formula': 3,
      'area': 1, 'volume': 1, 'perimeter': 2, 'circumference': 3,
      'radius': 1, 'diameter': 1, 'triangle': 2, 'circle': 1, 'rectangle': 1,
      'angle': 1, 'degrees': 1, 'radian': 2, 'sin': 1, 'cos': 1, 'tan': 1,
      ' pi': 1, ' Euler': 2,
    },
  },
  {
    id: 'physics',
    name: 'Physics',
    subject: 'Physics',
    color: '#8b5cf6',
    icon: 'ƒ',
    description: 'Mechanics, electromagnetism, quantum physics, relativity and waves.',
    systemPrompt:
      'You are the Physics Expert inside a Mixture-of-Experts AI system. You specialise in mechanics, electromagnetism, thermodynamics, waves and optics, quantum mechanics and relativity. Give clear physical explanations, include the relevant equations, and identify the underlying principle before solving.',
    keywords: {
      physics: 3, force: 2, velocity: 2, acceleration: 2, momentum: 3, newton: 3,
      gravity: 2, gravitation: 3, quantum: 3, relativity: 3, electricity: 2,
      electric: 1, magnet: 2, magnetic: 2, wave: 2, optics: 2, thermodynamics: 3,
      friction: 2, motion: 2, particle: 2, 'kinetic energy': 3, 'potential energy': 3,
      'speed of light': 3, 'black hole': 2, 'magnetic field': 3, electromagnetic: 3,
      frequency: 1, wavelength: 2, angular: 2, impulse: 2, photon: 3, electron: 2,
      nuclear: 2, circuit: 2, voltage: 3, resistance: 2, inertia: 3, torque: 3,
      'energy': 1, 'mass': 1,
    },
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    subject: 'Chemistry',
    color: '#ec4899',
    icon: '⚗',
    description: 'Atomic structure, reactions, stoichiometry, bonds and organic chemistry.',
    systemPrompt:
      'You are the Chemistry Expert inside a Mixture-of-Experts AI system. You specialise in atomic and molecular structure, chemical reactions and equations, stoichiometry, acids and bases, bonding, thermodynamics of reactions and organic chemistry. Balance equations, show mechanisms, and relate results to observable properties of matter.',
    keywords: {
      chemistry: 3, chemical: 2, molecule: 2, molecular: 2, atom: 2, atomic: 2,
      compound: 2, reaction: 2, 'chemical equation': 3, 'chemical bond': 3, acid: 2,
      'ph level': 3, 'ph scale': 3, 'ph value': 3, 'what is ph': 3, 'periodic table': 3, molar: 2, molarity: 3,
      combustion: 3, oxidation: 3, mole: 2, polymer: 2, catalyst: 3, ion: 2,
      titration: 3, buffer: 2, lewis: 2, stoichiometry: 3, 'gas law': 2,
      electrolysis: 3, 'organic chemistry': 3,
      'state of matter': 2,
    },
  },
  {
    id: 'biology',
    name: 'Biology',
    subject: 'Biology',
    color: '#10b981',
    icon: '✿',
    description: 'Cells, genetics, evolution, physiology and ecology.',
    systemPrompt:
      'You are the Biology Expert inside a Mixture-of-Experts AI system. You specialise in cell biology, genetics, molecular biology, evolution, physiology, anatomy and ecology. Frame answers in terms of structure and function, from molecules and cells up to organisms and ecosystems, and explain the underlying biological mechanism.',
    keywords: {
      biology: 3, biological: 3, cell: 2, cellular: 2, dna: 3, gene: 2, genetic: 2,
      organism: 2, evolution: 2, species: 2, protein: 2, enzyme: 2, ecosystem: 2,
      photosynthesis: 3, 'cell respiration': 3, 'cellular respiration': 3, anatomy: 2,
      bacteria: 2, virus: 2, reproduction: 2, genetics: 3, 'human body': 2,
      'natural selection': 3, chromosome: 3, mitochondria: 3, nucleus: 2, tissue: 1,
      blood: 1, brain: 1, biodiversity: 3, immune: 2, 'cell division': 3,
      'living things': 3, evolutionary: 3, hormone: 2, 'nervous system': 3,
      'organ': 1,
    },
  },
  {
    id: 'history',
    name: 'History',
    subject: 'History',
    color: '#f59e0b',
    icon: '§',
    description: 'World history, civilisations, wars, revolutions and timelines.',
    systemPrompt:
      'You are the History Expert inside a Mixture-of-Experts AI system. You specialise in world history: ancient civilisations, empires, wars, revolutions, treaties, political and social history. Place topics in chronological and geographic context, weigh primary sources and competing interpretations, and distinguish established facts from scholarly debate.',
    keywords: {
      history: 2, historical: 3, ancient: 2, century: 1, war: 2, empire: 2,
      king: 1, revolution: 2, treaty: 3, civilization: 3, 'middle ages': 3,
      medieval: 3, renaissance: 3, 'cold war': 3, rome: 3, roman: 3, egypt: 2,
      dynasty: 3, timeline: 2, historian: 3, 'world war': 3, 'civil war': 3,
      'bronze age': 3, 'industrial revolution': 3, archaeology: 3,
      'roman empire': 3, greek: 2, 'ancient egypt': 3, napoleon: 3,
      'british empire': 3, feudal: 3, soviet: 2, president: 1, 'era': 1,
    },
  },
  {
    id: 'coding',
    name: 'Coding',
    subject: 'Coding',
    color: '#3b82f6',
    icon: '</>',
    description: 'Programming, debugging, algorithms, data structures and software engineering.',
    systemPrompt:
      'You are the Coding Expert inside a Mixture-of-Experts AI system. You specialise in programming, algorithms, data structures, debugging, software architecture and development tooling. Analyse the problem, choose an appropriate data structure and algorithm, sketch the approach, then write clean, testable code and check edge cases and error handling.',
    keywords: {
      code: 2, coding: 3, programming: 3, bug: 3,
      javascript: 3, python: 3, java: 2, 'c++': 3, html: 3, css: 3, sql: 3,
      algorithm: 2, debug: 3, syntax: 2, framework: 2, react: 2, node: 1, git: 2,
      compile: 3, compiler: 3, runtime: 2, dependency: 2, endpoint: 2, database: 2,
      regex: 3, linux: 2, docker: 2,
      refactor: 3, 'unit test': 2, typescript: 3, frontend: 2, backend: 2, cli: 2,
      'object oriented': 3, recursion: 3, 'binary search': 3, 'rest api': 3,
      deploy: 2,
    },
  },
  {
    id: 'language',
    name: 'Language',
    subject: 'Language',
    color: '#14b8a6',
    icon: '文',
    description: 'Grammar, translation, writing, vocabulary, literature and linguistics.',
    systemPrompt:
      'You are the Language Expert inside a Mixture-of-Experts AI system. You specialise in grammar, vocabulary, translation, writing and editing, linguistics, literature and rhetoric. Consider register and tone, rewrite or explain with clarity and precision, and give examples to illustrate your points.',
    keywords: {
      language: 2, translate: 3, translation: 3, grammar: 3, vocabulary: 2,
      sentence: 2, paragraph: 2, essay: 2, synonym: 2, antonym: 2, spelling: 2,
      pronunciation: 2, meaning: 1, linguistics: 3, 'figure of speech': 2,
      metaphor: 2, poem: 2, poetry: 2, punctuation: 3, verb: 2, noun: 2,
      adjective: 2, tense: 2, literature: 2, novel: 1, word: 1, phrase: 1,
      'in spanish': 3, 'in french': 3, 'in german': 3, 'in hindi': 3,
      'in japanese': 3, 'in chinese': 3, idiom: 3, rewrite: 2, proofread: 3,
    },
  },
  {
    id: 'general',
    name: 'General',
    subject: 'General',
    color: '#64748b',
    icon: '✦',
    description: 'Broad general knowledge; the fallback when no specialist is confident.',
    systemPrompt:
      'You are the General Expert inside a Mixture-of-Experts AI system. You draw on broad knowledge across many fields to give accurate, balanced and clearly structured answers. When a topic is outside your confidence, say so plainly, and flag uncertainty where it exists.',
    keywords: {
      general: 1, 'in general': 2, overview: 0.5, 'explain': 0.3, 'tell me': 0.3,
    },
  },
];

const GENERAL_ID = 'general';

module.exports = { EXPERTS, GENERAL_ID };
