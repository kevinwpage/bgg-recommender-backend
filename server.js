import express from "express";
import cors from "cors";
import axios from "axios";
import xml2js from "xml2js";

const app = express();
app.use(cors());
app.use(express.json());

// Helper to fetch and parse BGG XML data
async function fetchBGG(id) {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${id}&stats=1`;
  const res = await axios.get(url);
  const parsed = await xml2js.parseStringPromise(res.data, { explicitArray: false });
  return parsed.items.item;
}

// Helper to search for game ID by name
async function searchBGG(name) {
  const url = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(name)}&type=boardgame`;
  const res = await axios.get(url);
  const parsed = await xml2js.parseStringPromise(res.data, { explicitArray: false });
  const items = parsed.items.item;
  if (!items) throw new Error(`No BGG search results for ${name}`);
  const first = Array.isArray(items) ? items[0] : items;
  return first.$.id;
}

app.post("/recommend", async (req, res) => {
  try {
    const { favorites } = req.body;
    if (!Array.isArray(favorites) || favorites.length === 0) {
      return res.status(400).json({ error: "No favorites provided." });
    }

    const recommendations = [];

    for (const game of favorites) {
      try {
        const id = await searchBGG(game.trim());
        const data = await fetchBGG(id);
        recommendations.push({
          name: data.name.value,
          image: data.thumbnail,
          reason: `Because you like ${game}, you might enjoy ${data.name.value} (${data.yearpublished}).`
        });
      } catch (e) {
        console.warn(`Failed to get data for ${game}:`, e.message);
      }
    }

    return res.json({ recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 BGG Recommender API running on port ${PORT}`));