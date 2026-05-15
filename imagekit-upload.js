const ImageKit = require('imagekit');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) {
        return res.status(500).json({ error: 'IMAGEKIT_PRIVATE_KEY not set' });
    }

    const imagekit = new ImageKit({
        publicKey: 'public_NU8lEcsKaqWGAFbL6rOB94/ewBQ=',
        privateKey: privateKey,
        urlEndpoint: 'https://ik.imagekit.io/svtrvuvxm'
    });

    try {
        const { file, fileName, folder } = req.body;
        if (!file || !fileName) {
            return res.status(400).json({ error: 'Missing file or fileName' });
        }

        const result = await imagekit.upload({
            file: file,
            fileName: fileName,
            folder: folder || '/levelup-services'
        });

        return res.status(200).json({
            url: result.url,
            fileId: result.fileId,
            name: result.name,
            filePath: result.filePath
        });
    } catch (err) {
        console.error('[imagekit-upload] error:', err);
        return res.status(500).json({ error: err.message || 'Upload failed' });
    }
};
