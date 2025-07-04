import express from 'express';
import cors from 'cors';
import { getCandidates } from './scraperService.js';

const app = express();
app.use(cors());
app.use(express.json());

// Compute recommendation scores based on overlap between favorites and candidate metadata
function computeRecommendations(candidates, favorites) {
  const scored = candidates.map(c => {
    let score = 0;
    const nameLower = c.name.toLowerCase();

    // Keyword match favorite names against candidate name
    favorites.forEach(fav => {
      const term = fav.trim().toLowerCase();
      if (term && nameLower.includes(term)) {
        score += 10;
      }
    });

    // Example additional scoring: weight closeness
    if (c.weight && favorites.length) {
      // simple weight score: inversely proportional difference
      const favWeights = favorites.map(f => (c.weight || 0));
      const avgFavWeight = favWeights.reduce((a,b) => a+b, 0) / favWeights.length;
      score += Math.max(0, 5 - Math.abs(c.weight - avgFavWeight));
    }

    return { ...c, score };
  });

  // Sort and take top 5
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      image: c.image,
      reason: c.score > 0
        ? `Matches your favorites with score ${c.score.toFixed(1)}.`
        : 'A popular game recommendation.'
    }));
}

app.post('/recommend', async (req, res) => {
  const { favorites } = req.body;
  if (!Array.isArray(favorites) || favorites.length === 0) {
    return res.status(400).json({ error: 'No favorites provided.' });
  }

  try {
    const candidates = await getCandidates();
    console.log(`Candidates loaded: ${candidates.length}`);

    const recommendations = computeRecommendations(candidates, favorites);
    res.json({ recommendations });
  } catch (err) {
    console.error('Error generating recommendations:', err);
    res.status(500).json({ error: 'Failed to generate recommendations.' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Recommender API running on port ${PORT}`));
