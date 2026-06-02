const Parser = require('rss-parser');

// Configuration avancée du parser pour capter images ET vidéos de toutes sources
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

// Sources d'actualités
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

// Fonction pour chercher les images de façon intelligente
function extractBestImage(item, sourceName) {
    let img = null;

    if (item.mediaContent && item.mediaContent['$'] && item.mediaContent['$'].url && !item.mediaContent['$'].type?.startsWith('video/')) {
        img = item.mediaContent['$'].url;
    } else if (item.mediaThumbnail && item.mediaThumbnail['$'] && item.mediaThumbnail['$'].url) {
        img = item.mediaThumbnail['$'].url;
    } else if (item.enclosure && item.enclosure.url && item.enclosure.url.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
        img = item.enclosure.url;
    } else {
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

    if (!img || img.length < 5) {
        const safeSeed = encodeURIComponent((item.title || sourceName).substring(0, 20).replace(/[^a-zA-Z0-9]/g, ''));
        img = `https://picsum.photos/seed/${safeSeed}/800/450`;
    }

    return img;
}

// ALGORITHME DE DÉTECTION VIDÉO ULTRA-LARGE (MULTI-PLATEFORME & FICHIERS DIRECTS)
function extractBestVideo(item) {
    let video = null;
    const htmlContent = (item.contentEncoded || '') + ' ' + (item.description || '');

    // 1. Détection des lecteurs embarqués et iFrames de tous types (YouTube, Twitch, Vimeo, TikTok, Dailymotion, Streamable)
    const iframeRegex = /src=["'](https:\/\/(?:www\.)?(?:youtube\.com\/embed|dailymotion\.com\/embed\/video|player\.vimeo\.com\/video|player\.twitch\.tv\/\?channel|tiktok\.com\/embed|streamable\.com\/e)\/[^"']+)["']/i;
    const matchIframe = htmlContent.match(iframeRegex);
    
    if (matchIframe) {
        video = matchIframe[1];
    }

    // 2. Détection de liens bruts de partage vidéo dans le texte de l'article (ex: Twitch, Streamable, TikTok)
    if (!video) {
        const linkRegex = /(https:\/\/(?:www\.)?(?:twitch\.fr\/videos\/|streamable\.com\/|tiktok\.com\/@[\w.-]+\/video\/|vimeo\.com\/)\w+)/i;
        const matchLink = htmlContent.match(linkRegex);
        if (matchLink) {
            video = matchLink[1];
        }
    }

    // 3. Détection d'une balise vidéo HTML5 directe (<video src="..."> ou <source src="...">)
    if (!video) {
        const videoTagRegex = /<(?:video|source)[^>]+src=["']([^"']+\.(?:mp4|webm|ogg|m3u8)(?:\?[^"']*)?)["']/i;
        const matchVideo = htmlContent.match(videoTagRegex);
        if (matchVideo) {
            video = matchVideo[1];
        }
    }

    // 4. Détection dans les pièces jointes (Enclosure) si le format est de type vidéo
    if (!video && item.enclosure && item.enclosure.url) {
        const type = item.enclosure.type || '';
        const isVideoUrl = item.enclosure.url.match(/\.(mp4|webm|ogg|m3u8|mov|avi)/i);
        if (type.startsWith('video/') || isVideoUrl) {
            video = item.enclosure.url;
        }
    }
    
    // 5. Détection dans les balises de médias modernes (media:content)
    if (!video && item.mediaContent && item.mediaContent['$']) {
        const mediaUrl = item.mediaContent['$'].url;
        const mediaType = item.mediaContent['$'].type || '';
        if (mediaType.startsWith('video/') || mediaUrl?.match(/\.(mp4|webm|ogg|m3u8|mov|avi)/i)) {
            video = mediaUrl;
        }
    }

    return video; // Renvoie l'URL trouvée (embed ou brute) ou null si aucune vidéo n'est présente
}

async function fetchCategoryNews(categoryKey) {
    const sources = SOURCES[categoryKey];
    if (!sources) return [];

    let allArticles = [];

    const requests = sources.map(async (source) => {
        try {
            const feed = await parser.parseURL(source.url);
            return feed.items.map(item => {
                
                const finalImage = extractBestImage(item, source.name);
                const finalVideo = extractBestVideo(item); 

                return {
                    title: item.title,
                    link: item.link,
                    desc: item.contentSnippet || item.content || item.description || '',
                    date: item.pubDate || item.isoDate || new Date().toISOString(),
                    img: finalImage,
                    video: finalVideo, 
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

    // Tri chronologique des actualités
    return allArticles.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 300);
}

// Export d'API Vercel avec gestion CORS et Cache de 5 minutes
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

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
