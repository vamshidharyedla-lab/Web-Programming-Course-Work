// This is the same matching logic as the backend, but running in the browser.
// It lets us show match scores without an extra API call.

const Matcher = {

  // How much each factor contributes to the final score (must add to 1.0)
  WEIGHTS: {
    category: 0.30,
    keywords: 0.25,
    location: 0.20,
    color:    0.10,
    date:     0.10,
    title:    0.05
  },

  // Compare a lost item and a found item and return a score 0-100
  score(itemA, itemB) {
    if (itemA.type === itemB.type) return 0;

    const lost  = itemA.type === 'lost'  ? itemA : itemB;
    const found = itemA.type === 'found' ? itemA : itemB;

    let total = 0;
    const breakdown = {};

    // Same category = full points
    breakdown.category = lost.category === found.category ? 1 : 0;
    total += breakdown.category * this.WEIGHTS.category;

    // What fraction of keywords overlap
    breakdown.keywords = this.jaccardSimilarity(lost.keywords || [], found.keywords || []);
    total += breakdown.keywords * this.WEIGHTS.keywords;

    // Word overlap in location text
    breakdown.location = this.wordOverlap(
      (lost.location  || '').toLowerCase(),
      (found.location || '').toLowerCase()
    );
    total += breakdown.location * this.WEIGHTS.location;

    // Exact color match
    breakdown.color = (lost.color && found.color &&
      lost.color.toLowerCase() === found.color.toLowerCase()) ? 1 : 0;
    total += breakdown.color * this.WEIGHTS.color;

    // Dates close together = higher score (full score within 5 days)
    const daysBetween = Math.abs(new Date(lost.date) - new Date(found.date)) / (1000 * 60 * 60 * 24);
    breakdown.date = Math.max(0, 1 - daysBetween / 5);
    total += breakdown.date * this.WEIGHTS.date;

    // Character-pair similarity of the titles
    breakdown.title = this.bigramSimilarity(
      (lost.title  || '').toLowerCase(),
      (found.title || '').toLowerCase()
    );
    total += breakdown.title * this.WEIGHTS.title;

    return {
      score: Math.round(total * 100),
      breakdown,
      lostItem: lost,
      foundItem: found
    };
  },

  // Jaccard: what fraction of unique words appear in both lists
  jaccardSimilarity(listA, listB) {
    if (!listA.length || !listB.length) return 0;
    const setA = new Set(listA.map(k => k.toLowerCase()));
    const setB = new Set(listB.map(k => k.toLowerCase()));
    let common = 0;
    setA.forEach(w => { if (setB.has(w)) common++; });
    return common / new Set([...setA, ...setB]).size;
  },

  // Count how many words from string A also appear in string B
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

  // Compare character pairs (bigrams) from two strings
  bigramSimilarity(a, b) {
    if (!a || !b) return 0;
    function getBigrams(str) {
      const pairs = new Set();
      for (let i = 0; i < str.length - 1; i++) pairs.add(str.slice(i, i + 2));
      return pairs;
    }
    const bigramsA = getBigrams(a);
    const bigramsB = getBigrams(b);
    let shared = 0;
    bigramsA.forEach(p => { if (bigramsB.has(p)) shared++; });
    const total = bigramsA.size + bigramsB.size;
    return total === 0 ? 0 : (2 * shared) / total;
  },

  // Find all lost+found pairs that score above the threshold
  findMatches(items, threshold = 30) {
    const lostItems  = items.filter(i => i.type === 'lost'  && i.status === 'open');
    const foundItems = items.filter(i => i.type === 'found' && i.status === 'open');

    const results = [];
    lostItems.forEach(lost => {
      foundItems.forEach(found => {
        const result = this.score(lost, found);
        if (result.score >= threshold) results.push(result);
      });
    });

    results.sort((a, b) => b.score - a.score);

    // Remove duplicates
    const seen = new Set();
    return results.filter(m => {
      const key = `${m.lostItem._id || m.lostItem.id}_${m.foundItem._id || m.foundItem.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  // Find matches for one specific item from a list of all items
  findMatchesForItem(item, allItems, threshold = 25) {
    const oppositeType = item.type === 'lost' ? 'found' : 'lost';

    const candidates = allItems.filter(i =>
      i.type === oppositeType &&
      i.status === 'open' &&
      String(i._id || i.id) !== String(item._id || item.id)
    );

    return candidates
      .map(c => this.score(item, c))
      .filter(r => r.score >= threshold)
      .sort((a, b) => b.score - a.score);
  }
};
