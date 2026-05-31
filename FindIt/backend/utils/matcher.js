// This module scores how well a lost item matches a found item.
// Each factor (category, keywords, location, color, date, title)
// gets a score between 0 and 1, then they are combined using weights.

const Matcher = {

  // How much each factor counts toward the final score
  WEIGHTS: {
    category: 0.30,
    keywords: 0.25,
    location: 0.20,
    color:    0.10,
    date:     0.10,
    title:    0.05
  },

  // Score a lost item against a found item (or vice versa)
  score(itemA, itemB) {
    // We can only compare a lost item with a found item
    if (itemA.type === itemB.type) return 0;

    const lost  = itemA.type === 'lost'  ? itemA : itemB;
    const found = itemA.type === 'found' ? itemA : itemB;

    let total = 0;
    const breakdown = {};

    // Category: full score if they're in the same category
    const catScore = lost.category === found.category ? 1 : 0;
    breakdown.category = catScore;
    total += catScore * this.WEIGHTS.category;

    // Keywords: what fraction of words appear in both lists
    const kwScore = this.jaccardSimilarity(lost.keywords || [], found.keywords || []);
    breakdown.keywords = kwScore;
    total += kwScore * this.WEIGHTS.keywords;

    // Location: word-by-word overlap between the two location strings
    const locScore = this.wordOverlap(
      (lost.location  || '').toLowerCase(),
      (found.location || '').toLowerCase()
    );
    breakdown.location = locScore;
    total += locScore * this.WEIGHTS.location;

    // Color: full score if both colors match exactly
    const colorMatch = lost.color && found.color &&
      lost.color.toLowerCase() === found.color.toLowerCase();
    breakdown.color = colorMatch ? 1 : 0;
    total += breakdown.color * this.WEIGHTS.color;

    // Date: full score if dates are within 5 days, then fades to 0
    const daysBetween = Math.abs(new Date(lost.date) - new Date(found.date)) / (1000 * 60 * 60 * 24);
    const dateScore = Math.max(0, 1 - daysBetween / 5);
    breakdown.date = dateScore;
    total += dateScore * this.WEIGHTS.date;

    // Title: character-pair similarity between the two titles
    const titleScore = this.bigramSimilarity(
      (lost.title  || '').toLowerCase(),
      (found.title || '').toLowerCase()
    );
    breakdown.title = titleScore;
    total += titleScore * this.WEIGHTS.title;

    return {
      score: Math.round(total * 100),
      breakdown,
      lostItem: lost,
      foundItem: found
    };
  },

  // Jaccard similarity: intersection / union of two keyword arrays
  jaccardSimilarity(listA, listB) {
    if (!listA.length || !listB.length) return 0;

    const setA = new Set(listA.map(k => k.toLowerCase()));
    const setB = new Set(listB.map(k => k.toLowerCase()));

    let common = 0;
    setA.forEach(word => { if (setB.has(word)) common++; });

    const union = new Set([...setA, ...setB]).size;
    return common / union;
  },

  // Word overlap: how many words from string A appear in string B
  wordOverlap(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;

    const wordsA = new Set(a.split(/[\s,\/\-]+/).filter(Boolean));
    const wordsB = new Set(b.split(/[\s,\/\-]+/).filter(Boolean));

    let shared = 0;
    wordsA.forEach(w => { if (wordsB.has(w)) shared++; });

    const bigger = Math.max(wordsA.size, wordsB.size);
    return bigger === 0 ? 0 : shared / bigger;
  },

  // Bigram similarity: compares pairs of characters between two strings
  // e.g. "cat" → ["ca","at"]. More shared pairs = higher score
  bigramSimilarity(a, b) {
    if (!a || !b) return 0;

    function getBigrams(str) {
      const pairs = new Set();
      for (let i = 0; i < str.length - 1; i++) {
        pairs.add(str.slice(i, i + 2));
      }
      return pairs;
    }

    const bigramsA = getBigrams(a);
    const bigramsB = getBigrams(b);

    let shared = 0;
    bigramsA.forEach(pair => { if (bigramsB.has(pair)) shared++; });

    const totalPairs = bigramsA.size + bigramsB.size;
    return totalPairs === 0 ? 0 : (2 * shared) / totalPairs;
  },

  // Find all matches across all items above the given score threshold
  findMatches(items, threshold = 30) {
    const lostItems  = items.filter(i => i.type === 'lost'  && i.status === 'open');
    const foundItems = items.filter(i => i.type === 'found' && i.status === 'open');

    const results = [];

    lostItems.forEach(lost => {
      foundItems.forEach(found => {
        const result = this.score(lost, found);
        if (result.score >= threshold) {
          results.push(result);
        }
      });
    });

    // Sort by best match first
    results.sort((a, b) => b.score - a.score);

    // Remove duplicate pairs
    const seen = new Set();
    return results.filter(m => {
      const key = `${m.lostItem._id || m.lostItem.id}_${m.foundItem._id || m.foundItem.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  // Find matches for one specific item against all others
  findMatchesForItem(item, allItems, threshold = 25) {
    const oppositeType = item.type === 'lost' ? 'found' : 'lost';

    const candidates = allItems.filter(i =>
      i.type === oppositeType &&
      i.status === 'open' &&
      String(i._id) !== String(item._id)
    );

    return candidates
      .map(c => this.score(item, c))
      .filter(r => r.score >= threshold)
      .sort((a, b) => b.score - a.score);
  }
};

module.exports = Matcher;
