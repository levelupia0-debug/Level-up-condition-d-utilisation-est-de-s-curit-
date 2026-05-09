export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Seules les requêtes POST sont autorisées' });
  }

  const { email, type } = JSON.parse(req.body);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Level <contact@levelup-ecosystem.com>',
        to: [email],
        subject: type === 'WELCOME' ? 'Bienvenue dans l\'écosystème Level !' : 'Notification Level',
        html: `<strong>Félicitations !</strong><br>Ton compte est actif. Profite bien de LevelMovie, Music et IA.`
      }),
    });

    if (response.ok) {
      res.status(200).json({ message: 'Email envoyé !' });
    } else {
      res.status(500).json({ error: 'Erreur service email' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
