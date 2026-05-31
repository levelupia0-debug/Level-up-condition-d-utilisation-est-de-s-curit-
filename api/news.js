const Parser = require('rss-parser');

const parser = new Parser({
    customFields: {
        item: [
            ['media:content', 'media'],
            ['enclosure', 'enclosure'],
            ['content:encoded', 'contentEncoded']
        ]
    }
});

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
    ]
};

async function fetchCategoryNews(categoryKey) {
    const sources = SOURCES[categoryKey];
    if (!sources) return [];

    let allArticles = [];

    const requests = sources.map(async (source) => {
        try {
            const feed = await parser.parseURL(source.url);
            return feed.items.map(item => {
                let img = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800'; 
                if (item.media && item.media['$'] && item.media['$'].url) img = item.media['$'].url;
                else if (item.enclosure && item.enclosure.url) img = item.enclosure.url;
                else if (item.contentEncoded) {
                    const match = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/);
                    if (match) img = match[1];
                }

                return {
                    title: item.title,
                    link: item.link,
                    desc: item.contentSnippet || item.content || '',
                    date: item.pubDate || item.isoDate,
                    img: img,
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

    return allArticles.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 300);
}

// Nouvel export standard Vercel avec gestion propre du CORS
export default async function handler(req, res) {
    // Configuration des headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Intercepter la requête de pré-vérification (Preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Cache Vercel pendant 15 minutes (900 secondes) pour soulager les flux RSS et accélérer l'app
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');

    // Récupération de la catégorie (ou 'all' par défaut)
    const category = req.query.category || 'all';

    try {
        if (category === 'all') {
            let mixed = [];
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
