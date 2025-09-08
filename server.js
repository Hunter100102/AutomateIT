// ---- Google Reviews proxy (Places API v1)
app.get('/api/reviews', async (req, res) => {
  try {
    const placeId = (req.query.placeId || '').trim();

    if (!placeId) {
      return res.status(400).json({ error: "Missing 'placeId' query param" });
    }
    // Guard: users often paste a CID (0x...:0x...) instead of Place ID (ChIJ...)
    if (/^0x/i.test(placeId)) {
      return res.status(400).json({
        error: "You passed a CID (0x…). Convert it to a Place ID (starts with 'ChIJ…') and try again."
      });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY env var' });
    }

    const fields = [
      'id',
      'displayName',
      'rating',
      'userRatingCount',
      'googleMapsUri',
      'reviews'
    ].join(',');

    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=${encodeURIComponent(fields)}`;

    const resp = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': fields
      }
    });

    // Bubble up Google error messages if any
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).send(text);
    }

    const data = await resp.json();

    // Normalize shape for your frontend
    const payload = {
      id: data.id,
      name: data.displayName?.text || data.displayName || '',
      rating: data.rating ?? null,
      userRatingCount: data.userRatingCount ?? 0,
      googleMapsUri: data.googleMapsUri || '',
      reviews: (data.reviews || []).map(r => ({
        author: r.authorAttribution?.displayName || 'Anonymous',
        profileUrl: r.authorAttribution?.uri || '',
        text: r.text?.text || r.text || '',
        starRating: r.rating ?? null,
        publishTime: r.publishTime || null
      }))
    };

    res.json(payload);
  } catch (err) {
    console.error('Reviews endpoint error:', err);
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
});
