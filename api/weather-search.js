export default async function handler(req, res) {
  const { q } = req.query;
  const API_KEY = process.env.WEATHER_API_KEY;

  // Sécurité de configuration
  if (!API_KEY) {
    return res.status(500).json({ error: "System configuration error." });
  }
  
  // On ne lance la recherche que si l'utilisateur a tapé au moins 2 caractères
  if (!q || q.length < 2) {
    return res.status(200).json([]);
  }

  try {
    // On interroge l'API de "recherche" (search.json) de WeatherAPI
    const response = await fetch(`https://api.weatherapi.com/v1/search.json?key=${API_KEY}&q=${encodeURIComponent(q)}`);
    
    if (!response.ok) {
      return res.status(response.status).json([]);
    }

    const data = await response.json();
    
    // On renvoie le tableau de suggestions (ex: [{name: "Paris", country: "France", ...}])
    // SANS JAMAIS exposer la clé API au navigateur !
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json([]);
  }
}
