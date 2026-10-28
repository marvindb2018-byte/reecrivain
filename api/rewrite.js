const TONES = {
  professionnel: "un ton professionnel et soigné, adapté au monde du travail",
  courtois: "un ton courtois, poli et bienveillant",
  joyeux: "un ton joyeux, enthousiaste et chaleureux",
  concis: "un style concis et direct, en supprimant le superflu",
  decontracte: "un ton décontracté et naturel",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { text, tone } = req.body || {};

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Texte manquant" });
  }
  if (text.length > 5000) {
    return res.status(400).json({ error: "Texte trop long (5000 caractères max)" });
  }
  if (!TONES[tone]) {
    return res.status(400).json({ error: "Ton inconnu" });
  }

  try {
    const response = await fetch(`${process.env.API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.MODEL,
        messages: [
          {
            role: "system",
            content:
              `Tu es un rédacteur expert en français. Réécris le texte fourni avec ${TONES[tone]}. ` +
              "Conserve le sens et toutes les informations. " +
              "Réponds uniquement avec le texte réécrit, sans introduction ni commentaire.",
          },
          { role: "user", content: text },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Le fournisseur IA a renvoyé une erreur" });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() ?? "";
    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
