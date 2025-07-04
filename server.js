import express from 'express';
import cors from 'cors';
import { getCandidates } from './scraperService.js';

const app = express();
app.use(cors());
app.use(express.json());

function computeRecommendations(candidates, favorites) {
  const scored = candidates.map(c => {
    let score = 0;
    const nameLower = c.name.toLowerCase();

    favorites.forEach(fav => {
      const term = fav.trim().toLowerCase();
      if (term && nameLower.includes(term)) score += 10;
    });

    if (c.weight && favorites.length) {
      const avgFavWeight = candidates
        .filter(c => c.weight)
        .map(c => c.weight)
        .reduce((a,b) => a+b, 0) / favorites.length;
      score += Math.max(0, 5 - Math.abs(c.weight - avgFavWeight));
    }

    return { ...c, score };
  });

  return scored
    .sort((a,b) => b.score - a.score)
    .slice(0,5)
    .map(c => ({ name: c.name, image: c.image,
      reason: c.score > 0
        ? `Matches your favorites (score ${c.score.toFixed(1)})`
        : 'Popular recommendation'
    }));
}

app.post('/recommend', async (req, res) => {
  const { favorites } = req.body;
  if (!Array.isArray(favorites) || !favorites.length)
    return res.status(400).json({ error: 'No favorites provided.' });

  try {
    const candidates = await getCandidates();
    console.log(`Loaded ${candidates.length} candidates`);
    const recommendations = computeRecommendations(candidates, favorites);
    res.json({ recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Recommendation generation failed.' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));
