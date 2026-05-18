export default async function handler(req, res) {
  let { q } = req.query;
  const API_KEY = process.env.WEATHER_API_KEY;

  // Si le serveur n'a pas accès à la clé secrète, on renvoie une erreur de configuration
  if (!API_KEY) {
    return res.status(500).json({ error: "System configuration error." });
  }
  if (!q) {
    return res.status(400).json({ error: "Invalid location parameter." });
  }

  // Pour la localisation automatique par IP
  if (q === "auto:ip") {
    const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
    if (clientIp) {
      q = clientIp.split(',')[0].trim();
    }
  }

  try {
    // Le serveur effectue la requête de manière masquée
    const [fRes, aRes] = await Promise.all([
      fetch(`https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(q)}&days=3&aqi=yes&alerts=yes`),
      fetch(`https://api.weatherapi.com/v1/astronomy.json?key=${API_KEY}&q=${encodeURIComponent(q)}`)
    ]);

    if (!fRes.ok) {
      return res.status(fRes.status).json({ error: "Location not found." });
    }

    const fd = await fRes.json();
    const ad = await aRes.json();
    
    // On renvoie les données combinées au navigateur de l'utilisateur, SANS JAMAIS envoyer la clé !
    res.status(200).json({
      forecast: fd,
      astronomy: ad?.astronomy?.astro || null
    });

  } catch (error) {
    res.status(500).json({ error: "Internal server error." });
  }
}
