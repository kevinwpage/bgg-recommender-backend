import express from 'express';
import cors from 'cors';
import { getCandidates } from './scraperService.js';

const app = express();
app.use(cors());
app.use(express.json());

// Basic recommendation logic based on keyword matching
function computeRecommendations(candidates, favorites) {
  const scored = candidates.map(c => {
    let score = 0;
    const nameLower = c.name.toLowerCase();
    favorites.forEach(fav => {
      const term = fav.trim().toLowerCase();
      if (term && nameLower.includes(term)) {
        score += 10;
      }
    });
    return { ...c, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      image: c.image,
      reason: c.score > 0
        ? `Matches your favorite games with a score of ${c.score}.`
        : 'Recommended as a popular game you might enjoy.',
    }));
}

app.post('/recommend', async (req, res) => {
  const favorites = req.body.favorites;
  if (!Array.isArray(favorites) || favorites.length === 0) {
    return res.status(400).json({ error: 'No favorites provided.' });
  }

  try {
    const candidates = await getCandidates();
    console.log('Loaded candidates count:', candidates.length);

    const recommendations = computeRecommendations(candidates, favorites);
    res.json({ recommendations });
  } catch (err) {
    console.error('Error generating recommendations:', err);
    res.status(500).json({ error: 'Failed to generate recommendations.' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Recommender API running on port ${PORT}`));
