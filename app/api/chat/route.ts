import { vercel } from "@ai-sdk/vercel"
import { streamText } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, data, columns } = await req.json()

  const systemPrompt = `Tu es un assistant IA spécialisé dans l'analyse de données. Tu aides les utilisateurs à comprendre leurs datasets en répondant à leurs questions d'analyse.

${
  data && data.length > 0
    ? `
Contexte du dataset actuel:
- ${data.length} entrées
- Colonnes: ${columns.join(", ")}
- Colonnes numériques: ${columns
        .filter((col: string) => data.some((row: any) => !isNaN(Number.parseFloat(row[col])) && isFinite(row[col])))
        .join(", ")}
- Échantillon de données: ${JSON.stringify(data.slice(0, 3), null, 2)}
`
    : "Aucun dataset importé pour le moment."
}

Instructions:
1. Réponds uniquement aux questions d'analyse de données
2. Fournis des insights statistiques et des observations
3. Suggère des analyses possibles
4. Utilise un langage clair et pédagogique
5. Réponds en français
6. Ne génère PAS de code de visualisation (c'est géré séparément)

Concentre-toi sur l'analyse, les tendances, les corrélations, et les insights métier.`

  const result = streamText({
    model: vercel("v0-1.0-md"),
    system: systemPrompt,
    messages,
  })

  return result.toDataStreamResponse()
}
