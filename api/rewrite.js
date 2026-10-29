const TONES = {
  professionnel: "un ton professionnel et soigné, adapté au monde du travail",
  courtois: "un ton courtois, poli et bienveillant",
  joyeux: "un ton joyeux, enthousiaste et chaleureux",
  concis: "un style concis et direct, en supprimant le superflu",
  decontracte: "un ton décontracté et naturel",
};

const LANGS = {
  fr: "français",
  en: "anglais",
  es: "espagnol",
  de: "allemand",
  it: "italien",
  pt: "portugais",
  nl: "néerlandais",
  ar: "arabe",
  zh: "chinois",
  ja: "japonais",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { text, tone, lang, intensity } = req.body || {};
  const level = Number.isInteger(intensity) && intensity >= 1 && intensity <= 5 ? intensity : 3;
  const langName = typeof lang === "string" && Object.hasOwn(LANGS, lang) ? LANGS[lang] : null;

   const clean = req.body?.clean === true;
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
              `Tu es un rédacteur expert en français. Réécris le texte fourni avec ${TONES[tone]}. Intensité du ton : ${level} sur 5 (1 = à peine perceptible, 5 = très prononcé). ` +
              "Conserve le sens et toutes les informations. " +
              "Reformule en profondeur : change la structure des phrases et utilise des synonymes et des tournures différentes, sans recopier les mots et expressions du texte d'origine. Ne garde tels quels que les noms propres, chiffres, dates et termes techniques. " +
              (clean ? "Supprime ou remplace toute insulte, grossièreté, vulgarité et formulation agressive ou irrespectueuse, en gardant les faits et les demandes de l'auteur. " : "") +
              "Écris dans la même langue que le texte d'origine. " +
              "Réponds uniquement avec le texte réécrit, sans introduction ni commentaire.",
          },
          { role: "user", content: text },
        ],
        temperature: 0.9,
      }),
    });

        if (!response.ok) {
      const detail = await response.text();
      console.error("Fournisseur IA:", response.status, detail);
      return res.status(502).json({ error: "Le fournisseur IA a renvoyé une erreur" });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() ?? "";
    let translation = "";
    if (langName && result) {
      const tr = await fetch(`${process.env.API_BASE}/chat/completions`, {
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
              content: `Traduis le texte suivant en ${langName}. Conserve le ton et le sens. Réponds uniquement avec la traduction, sans introduction ni commentaire.`,
            },
            { role: "user", content: result },
          ],
          temperature: 0.3,
        }),
      });
      if (tr.ok) {
        const trData = await tr.json();
        translation = trData.choices?.[0]?.message?.content?.trim() ?? "";
      }
    }

    return res.status(200).json({ result, translation });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
