const Parser = require('rss-parser');

// Configuration avancée du parser pour capter un maximum d'images
const parser = new Parser({
    customFields: {
        item: [
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail'],
            ['enclosure', 'enclosure'],
            ['content:encoded', 'contentEncoded'],
            ['description', 'description']
        ]
    }
});

// Ajout massif de nouvelles sources : Monde, Sports (Foot, etc) et Économie
const SOURCES = {
    gaming: [
        { name: 'JeuxVideo.com', url: 'https://www.jeuxvideo.com/rss/rss.xml' },
        { name: 'IGN France', url: 'https://fr.ign.com/feed.xml' },
        { name: 'Gameblog', url: 'https://www.gameblog.fr/rss.xml' },
        { name: 'Gamekult', url: 'https://www.gamekult.com/feed.xml' },
        { name: 'ActuGaming', url: 'https://www.actugaming.net/feed/' },
        { name: 'Xboxygen', url: 'https://www.xboxygen.com/spip.php?page=backend' },
        { name: 'GamerGen', url: 'https://www.gamergen.com/rss' }
    ],
    otaku: [
        { name: 'Manga-News', url: 'https://www.manga-news.com/index.php/rss' },
        { name: 'Adala-News', url: 'https://adala-news.fr/feed/' },
        { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/newsrss?lang=frFR' },
        { name: 'Nautiljon', url: 'https://www.nautiljon.com/actualite/rss.php' },
        { name: 'Anime News Network', url: 'https://www.animenewsnetwork.com/news/rss.xml?ann-edition=fr' }
    ],
    tools: [
        { name: 'Journal du Geek', url: 'https://www.journaldugeek.com/feed/' },
        { name: 'Frandroid', url: 'https://www.frandroid.com/feed' },
        { name: 'Numerama', url: 'https://www.numerama.com/feed/' },
        { name: 'Les Numériques', url: 'https://www.lesnumeriques.com/rss.xml' },
        { name: 'Presse-Citron', url: 'https://www.presse-citron.net/feed/' },
        { name: 'Phonandroid', url: 'https://www.phonandroid.com/feed' },
        { name: 'Korben', url: 'https://korben.info/feed' },
        { name: '01net', url: 'https://www.01net.com/actualites/feed/' }
    ],
    movies: [
        { name: 'Premiere', url: 'https://www.premiere.fr/rss/cinema' },
        { name: 'EcranLarge', url: 'https://www.ecranlarge.com/flux-rss/actus' },
        { name: 'CinéSéries', url: 'https://www.cineserie.com/feed/' },
        { name: 'JDG Ciné', url: 'https://www.journaldugeek.com/culture/feed/' }
    ],
    music: [
        { name: 'Tsugi', url: 'https://www.tsugi.fr/feed/' },
        { name: 'Les Inrocks', url: 'https://www.lesinrocks.com/musique/feed/' },
        { name: 'Metalorgie', url: 'https://www.metalorgie.com/feed/news' },
        { name: 'La Grosse Radio', url: 'https://www.lagrosseradio.com/feed/' }
    ],
    // --- NOUVELLES CATÉGORIES TEMPS RÉEL (FOOT, MONDE, INFO) ---
    sports: [
        { name: "L'Équipe", url: 'https://www.lequipe.fr/rss/actu_rss.xml' },
        { name: 'RMC Sport', url: 'https://rmcsport.bfmtv.com/rss/info/flux.xml' },
        { name: 'Eurosport', url: 'https://www.eurosport.fr/rss.xml' },
        { name: 'Foot Mercato', url: 'https://www.footmercato.net/rss' },
        { name: 'So Foot', url: 'https://www.sofoot.com/rss' }
    ],
    world: [
        { name: 'France Info', url: 'https://www.francetvinfo.fr/titres.rss' },
        { name: 'Le Monde', url: 'https://www.lemonde.fr/rss/une.xml' },
        { name: 'Le Figaro', url: 'https://www.lefigaro.fr/rss/figaro_actualites.xml' },
        { name: '20 Minutes', url: 'https://www.20minutes.fr/feeds/rss-actu-france.xml' },
        { name: 'Le Parisien', url: 'https://www.leparisien.fr/arcio/rss/' }
    ],
    economy: [
        { name: 'Les Echos', url: 'https://services.lesechos.fr/rss/les-echos-accueil.xml' },
        { name: 'La Tribune', url: 'https://www.latribune.fr/feed.xml' },
        { name: 'BFM Business', url: 'https://www.bfmtv.com/rss/economie/' }
    ]
};

// Fonction améliorée pour chercher les images cachées
function extractBestImage(item, sourceName) {
    let img = null;

    // 1. Chercher dans media:content ou media:thumbnail (Standard moderne)
    if (item.mediaContent && item.mediaContent['$'] && item.mediaContent['$'].url) {
        img = item.mediaContent['$'].url;
    } else if (item.mediaThumbnail && item.mediaThumbnail['$'] && item.mediaThumbnail['$'].url) {
        img = item.mediaThumbnail['$'].url;
    } 
    // 2. Chercher dans enclosure (Vieux standard)
    else if (item.enclosure && item.enclosure.url && item.enclosure.url.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
        img = item.enclosure.url;
    } 
    // 3. Scanner le contenu complet avec une Regex puissante (gère les apostrophes et guillemets)
    else {
        const regex = /<img[^>]+src=["']([^"']+)["']/i;
        
        if (item.contentEncoded) {
            const match = item.contentEncoded.match(regex);
            if (match) img = match[1];
        }
        
        if (!img && item.description) {
            const match = item.description.match(regex);
            if (match) img = match[1];
        }
    }

    // 4. FALLBACK INTELLIGENT : Si AUCUNE image n'est trouvée
    // Au lieu de mettre la même image partout, on génère une image unique basée sur le titre !
    if (!img || img.length < 5) {
        const safeSeed = encodeURIComponent((item.title || sourceName).substring(0, 20).replace(/[^a-zA-Z0-9]/g, ''));
        img = `https://picsum.photos/seed/${safeSeed}/800/450`;
    }

    return img;
}

async function fetchCategoryNews(categoryKey) {
    const sources = SOURCES[categoryKey];
    if (!sources) return [];

    let allArticles = [];

    const requests = sources.map(async (source) => {
        try {
            const feed = await parser.parseURL(source.url);
            return feed.items.map(item => {
                
                // Utilisation de notre nouvelle fonction d'extraction d'images
                const finalImage = extractBestImage(item, source.name);

                return {
                    title: item.title,
                    link: item.link,
                    desc: item.contentSnippet || item.content || item.description || '',
                    date: item.pubDate || item.isoDate || new Date().toISOString(),
                    img: finalImage,
                    source: source.name,
                    category: categoryKey
                };
            });
        } catch (error) {
            console.warn(`[News API] Impossible de lire : ${source.name}`);
            return [];
        }
    });

    const results = await Promise.allSettled(requests);
    results.forEach(res => {
        if (res.status === 'fulfilled') {
            allArticles = allArticles.concat(res.value);
        }
    });

    // Tri par date de la plus récente à la plus ancienne
    return allArticles.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 300);
}

// Export Vercel
export default async function handler(req, res) {
    // Configuration des headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Intercepter la requête de pré-vérification (Preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // MISE À JOUR : Cache réglé sur 300 secondes (5 minutes) pour du VRAI TEMPS RÉEL !
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    const category = req.query.category || 'all';

    try {
        if (category === 'all') {
            let mixed = [];
            // On récupère TOUTES les actus (foot, monde, gaming, etc)
            for (const cat of Object.keys(SOURCES)) {
                const news = await fetchCategoryNews(cat);
                mixed = mixed.concat(news);
            }
            mixed.sort((a, b) => new Date(b.date) - new Date(a.date));
            return res.status(200).json(mixed.slice(0, 800));
        }

        if (!SOURCES[category]) {
            return res.status(404).json({ error: "Catégorie introuvable." });
        }

        const news = await fetchCategoryNews(category);
        return res.status(200).json(news);

    } catch (error) {
        console.error("Erreur API News:", error);
        return res.status(500).json({ error: "Erreur serveur lors de la génération des actualités." });
    }
}
