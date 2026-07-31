/**
 * Text analysis for lyrics.
 *
 * The word statistics used to filter an English-only stopword list, so a German
 * song contributed nothing but "nicht", "immer", "wieder" — function words that
 * say nothing about the song. Every text panel inherits from here instead.
 */

const STOPWORDS_EN = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'if',
  'then',
  'than',
  'so',
  'because',
  'as',
  'while',
  'of',
  'at',
  'by',
  'for',
  'with',
  'about',
  'against',
  'between',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'to',
  'from',
  'up',
  'down',
  'in',
  'out',
  'on',
  'off',
  'over',
  'under',
  'again',
  'further',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'any',
  'both',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'too',
  'very',
  'can',
  'will',
  'just',
  'should',
  'now',
  'i',
  'me',
  'my',
  'mine',
  'myself',
  'we',
  'us',
  'our',
  'ours',
  'you',
  'your',
  'yours',
  'he',
  'him',
  'his',
  'she',
  'her',
  'hers',
  'it',
  'its',
  'they',
  'them',
  'their',
  'theirs',
  'what',
  'which',
  'who',
  'whom',
  'this',
  'that',
  'these',
  'those',
  'am',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'having',
  'do',
  'does',
  'did',
  'doing',
  'would',
  'could',
  'shall',
  'may',
  'might',
  'must',
  'let',
  'lets',
  'get',
  'got',
  'gonna',
  'wanna',
  'aint',
  'dont',
  'cant',
  'wont',
  'im',
  'ive',
  'youre',
  'its',
  'thats',
  'yeah',
  'oh',
  'ooh',
  'uh',
  'ah',
  'na',
  'la',
  'hey',
  'woah',
  'whoa',
  'mmm',
]);

const STOPWORDS_DE = new Set([
  'der',
  'die',
  'das',
  'den',
  'dem',
  'des',
  'ein',
  'eine',
  'einen',
  'einem',
  'einer',
  'eines',
  'und',
  'oder',
  'aber',
  'doch',
  'denn',
  'weil',
  'dass',
  'ob',
  'wenn',
  'als',
  'wie',
  'wo',
  'was',
  'wer',
  'wem',
  'wen',
  'warum',
  'ich',
  'du',
  'er',
  'sie',
  'es',
  'wir',
  'ihr',
  'mich',
  'dich',
  'sich',
  'uns',
  'euch',
  'mir',
  'dir',
  'ihm',
  'ihn',
  'ihnen',
  'mein',
  'meine',
  'meinen',
  'dein',
  'deine',
  'sein',
  'seine',
  'unser',
  'euer',
  'nicht',
  'kein',
  'keine',
  'nur',
  'noch',
  'schon',
  'auch',
  'immer',
  'wieder',
  'mehr',
  'sehr',
  'ganz',
  'so',
  'zu',
  'zur',
  'zum',
  'in',
  'im',
  'an',
  'am',
  'auf',
  'aus',
  'bei',
  'mit',
  'nach',
  'von',
  'vom',
  'vor',
  'für',
  'über',
  'unter',
  'durch',
  'um',
  'ohne',
  'gegen',
  'bis',
  'seit',
  'ist',
  'sind',
  'war',
  'waren',
  'bin',
  'bist',
  'hat',
  'habe',
  'haben',
  'hatte',
  'hatten',
  'wird',
  'werden',
  'wurde',
  'kann',
  'kannst',
  'können',
  'muss',
  'musst',
  'müssen',
  'will',
  'willst',
  'wollen',
  'soll',
  'sollst',
  'sollen',
  'darf',
  'mag',
  'geht',
  'gehen',
  'kommt',
  'kommen',
  'macht',
  'machen',
  'sagt',
  'sagen',
  'hier',
  'dort',
  'da',
  'dann',
  'jetzt',
  'heute',
  'man',
  'alle',
  'alles',
  'etwas',
  'nichts',
  'viel',
  'wenig',
  'ja',
  'nein',
  'mal',
  'weg',
  'einfach',
  'wirklich',
  'eigentlich',
]);

/** Filler that carries no meaning in either language. */
const STOPWORDS_SHARED = new Set([
  'yeah',
  'oh',
  'ooh',
  'uh',
  'ah',
  'na',
  'la',
  'hey',
  'woah',
  'whoa',
  'mmm',
  'hmm',
  'ey',
  'yo',
  'ok',
  'okay',
  'baby',
  'nanana',
  'lalala',
]);

/**
 * High-frequency markers used to guess a document's language. Deliberately
 * words that a stopword list would drop anyway — they are useless as content
 * but excellent as fingerprints.
 */
const MARKERS_DE = [
  'der',
  'die',
  'das',
  'und',
  'ich',
  'nicht',
  'ist',
  'mit',
  'ein',
  'auch',
  'wie',
  'noch',
  'nur',
  'schon',
  'wenn',
  'für',
  'sich',
  'mich',
  'dich',
  'immer',
];
const MARKERS_EN = [
  'the',
  'and',
  'you',
  'to',
  'of',
  'a',
  'in',
  'that',
  'it',
  'is',
  'was',
  'for',
  'on',
  'with',
  'my',
  'me',
  'be',
  'this',
  'but',
  'all',
];

export type Language = 'de' | 'en' | 'unknown';

/** Lowercased word tokens. Keeps German umlauts and apostrophes inside words. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'’-]+/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^[-']+|[-']+$/g, ''))
    .filter(Boolean);
}

/**
 * Guesses a document's language by marker density. No dependency, and good
 * enough to pick the right stopword list — which is all it is used for.
 */
export function detectLanguage(tokens: string[]): Language {
  if (tokens.length < 20) return 'unknown';
  let de = 0;
  let en = 0;
  for (const token of tokens) {
    if (MARKERS_DE.includes(token)) de++;
    if (MARKERS_EN.includes(token)) en++;
  }
  const total = tokens.length;
  // Below this, neither language's function words show up often enough to trust.
  if ((de + en) / total < 0.02) return 'unknown';
  if (de > en * 1.3) return 'de';
  if (en > de * 1.3) return 'en';
  return 'unknown';
}

/** Stopwords for a document, chosen by its own language. */
export function stopwordsFor(language: Language): Set<string> {
  if (language === 'de') return new Set([...STOPWORDS_DE, ...STOPWORDS_SHARED]);
  if (language === 'en') return new Set([...STOPWORDS_EN, ...STOPWORDS_SHARED]);
  // Mixed or too short to tell — drop both, since a word that is a function
  // word in either language is not what anyone means by "top word".
  return new Set([...STOPWORDS_DE, ...STOPWORDS_EN, ...STOPWORDS_SHARED]);
}

export interface Document {
  text: string;
  /** Grouping key — the artist, for signature words. */
  group?: string;
}

export interface WordCount {
  word: string;
  count: number;
}

/** Content words across a corpus, each document filtered in its own language. */
export function countWords(documents: Document[], limit = 50): WordCount[] {
  const counts = new Map<string, number>();
  for (const doc of documents) {
    const tokens = tokenize(doc.text);
    const stop = stopwordsFor(detectLanguage(tokens));
    for (const token of tokens) {
      if (token.length < 3 || stop.has(token)) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export interface LanguageShare {
  language: Language;
  songs: number;
}

/** How the collection splits across languages. */
export function languageBreakdown(documents: Document[]): LanguageShare[] {
  const counts = new Map<Language, number>();
  for (const doc of documents) {
    const language = detectLanguage(tokenize(doc.text));
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  const order: Language[] = ['de', 'en', 'unknown'];
  return order
    .map((language) => ({ language, songs: counts.get(language) ?? 0 }))
    .filter((entry) => entry.songs > 0);
}

export interface SignatureWord {
  word: string;
  /** Occurrences within this group. */
  count: number;
  /** tf-idf — how much this word belongs to this group rather than the corpus. */
  score: number;
}

export interface ArtistSignature {
  artist: string;
  songs: number;
  words: SignatureWord[];
}

/**
 * Words that belong to one artist rather than to the collection as a whole.
 *
 * Plain frequency just returns the same handful of words for everyone —
 * "love", "time", "night". Weighting each artist's term frequency against how
 * many *other* artists use the word surfaces what is actually theirs.
 */
export function signatureWords(
  documents: Document[],
  { minSongs = 2, perArtist = 6, maxArtists = 12 } = {},
): ArtistSignature[] {
  const byArtist = new Map<string, { tokens: string[]; songs: number }>();

  for (const doc of documents) {
    if (!doc.group) continue;
    const tokens = tokenize(doc.text);
    const stop = stopwordsFor(detectLanguage(tokens));
    const content = tokens.filter((t) => t.length >= 3 && !stop.has(t));
    const entry = byArtist.get(doc.group) ?? { tokens: [], songs: 0 };
    entry.tokens.push(...content);
    entry.songs += 1;
    byArtist.set(doc.group, entry);
  }

  const eligible = [...byArtist.entries()].filter(
    ([, entry]) => entry.songs >= minSongs && entry.tokens.length > 0,
  );
  if (eligible.length < 2) return [];

  // How many artists use each word at all — the "document" of the idf is the
  // artist, not the song, so a word repeated 40 times in one song still only
  // counts once.
  const artistsUsingWord = new Map<string, number>();
  for (const [, entry] of eligible) {
    for (const word of new Set(entry.tokens)) {
      artistsUsingWord.set(word, (artistsUsingWord.get(word) ?? 0) + 1);
    }
  }

  const totalArtists = eligible.length;

  return eligible
    .map(([artist, entry]) => {
      const counts = new Map<string, number>();
      for (const token of entry.tokens) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
      const words = [...counts.entries()]
        .map(([word, count]) => {
          const tf = count / entry.tokens.length;
          const idf = Math.log(
            totalArtists / (artistsUsingWord.get(word) ?? 1),
          );
          return { word, count, score: tf * idf };
        })
        // A word used by every artist has idf 0 and is not a signature.
        .filter((w) => w.score > 0 && w.count >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, perArtist);

      return { artist, songs: entry.songs, words };
    })
    .filter((entry) => entry.words.length > 0)
    .sort((a, b) => b.songs - a.songs)
    .slice(0, maxArtists);
}
