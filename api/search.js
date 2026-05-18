export default async function handler(req, res) {
  const { q } = req.query;
  const API_KEY = process.env.WEATHER_API_KEY;

  if (!API_KEY || !q) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    // Recherche de ville sécurisée
    const r = await fetch(`https://api.weatherapi.com/v1/search.json?key=${API_KEY}&q=${encodeURIComponent(q)}`);
    const d = await r.json();
    
    // Renvoie un simple tableau de suggestions
    res.status(200).json(Array.isArray(d) ? d : []);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
