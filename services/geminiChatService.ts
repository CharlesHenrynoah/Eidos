import { GoogleGenerativeAI } from "@google/generative-ai"

// Read API key from environment to keep secrets out of the repository
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export interface ChatResponse {
  message: string
  visualizationType?: string
}

// Corriger la méthode generateChatResponse pour utiliser correctement l'API Gemini

export async function generateChatResponse(userMessage: string, data: any[], columns: string[]): Promise<ChatResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    // Analyser les données pour le contexte
    const dataContext =
      data.length > 0
        ? {
            rowCount: data.length,
            columns: columns,
            sampleData: data.slice(0, 3),
            numericColumns: columns.filter((col) =>
              data.some((row) => !isNaN(Number.parseFloat(row[col])) && isFinite(row[col])),
            ),
          }
        : null

    const prompt = `
Tu es un assistant IA spécialisé dans la visualisation artistique de données en 3D. 
Tu aides les utilisateurs à créer des visualisations 3D magnifiques avec Three.js.

Contexte des données:
${
  dataContext
    ? `
- ${dataContext.rowCount} entrées
- Colonnes: ${dataContext.columns.join(", ")}
- Colonnes numériques: ${dataContext.numericColumns.join(", ")}
- Échantillon: ${JSON.stringify(dataContext.sampleData)}
`
    : "Aucune donnée importée pour le moment"
}

Types de visualisation 3D disponibles:
- "bars3d": Barres 3D architecturales
- "scatter3d": Nuage de points cosmique 
- "mandala3d": Mandala circulaire hypnotique

Message de l'utilisateur: "${userMessage}"

Instructions:
1. Réponds de manière enthousiaste et artistique
2. Si l'utilisateur demande un changement de style, identifie le type de visualisation
3. Donne des conseils créatifs sur la visualisation des données
4. Utilise un langage poétique et inspirant
5. Réponds en français

Si tu détectes une demande de changement de visualisation, inclus dans ta réponse:
VISUALIZATION_TYPE: [bars3d|scatter3d|mandala3d]

Exemples de détection:
- "barres", "architecture", "colonnes" → bars3d
- "nuage", "points", "scatter", "cosmique", "étoiles" → scatter3d  
- "mandala", "circulaire", "spiral", "hypnotique" → mandala3d
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extraire le type de visualisation si présent
    const visualizationMatch = text.match(/VISUALIZATION_TYPE:\s*(bars3d|scatter3d|mandala3d)/i)
    const visualizationType = visualizationMatch ? visualizationMatch[1].toLowerCase() : undefined

    // Nettoyer le message (enlever la ligne VISUALIZATION_TYPE)
    const cleanMessage = text.replace(/VISUALIZATION_TYPE:\s*(bars3d|scatter3d|mandala3d)/i, "").trim()

    return {
      message: cleanMessage,
      visualizationType,
    }
  } catch (error) {
    console.error("Erreur Gemini:", error)

    // Réponse de fallback avec détection simple
    let visualizationType: string | undefined

    const lowerMessage = userMessage.toLowerCase()
    if (lowerMessage.includes("barre") || lowerMessage.includes("architecture") || lowerMessage.includes("colonne")) {
      visualizationType = "bars3d"
    } else if (
      lowerMessage.includes("nuage") ||
      lowerMessage.includes("point") ||
      lowerMessage.includes("cosmique") ||
      lowerMessage.includes("scatter")
    ) {
      visualizationType = "scatter3d"
    } else if (
      lowerMessage.includes("mandala") ||
      lowerMessage.includes("circulaire") ||
      lowerMessage.includes("spiral")
    ) {
      visualizationType = "mandala3d"
    }

    const fallbackResponses = [
      "Excellente idée ! Je transforme vos données en une œuvre d'art 3D. Cette visualisation révèle les patterns cachés dans vos données.",
      "Magnifique ! Cette nouvelle perspective 3D va illuminer les relations entre vos variables de façon spectaculaire.",
      "Parfait ! Je génère une visualisation artistique qui transforme vos données en expérience immersive.",
    ]

    return {
      message: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
      visualizationType,
    }
  }
}
