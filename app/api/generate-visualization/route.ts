import { GoogleGenerativeAI } from "@google/generative-ai"

// Configuration de l'API Gemini
const apiKey = process.env.GEMINI_API_KEY || "AIzaSyB_lBRH0ja-p9-8Xzvzv8RfTU6z5QHKRWs"
const genAI = new GoogleGenerativeAI(apiKey)

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { data, columns, userRequest, modelDescription, modelRequirements } = await req.json()

    // Analyse des types de colonnes disponibles
    const columnTypes = columns.reduce(
      (acc: any, col: string) => {
        const values = data.map((row: any) => row[col])
        const isNumeric = values.every((v: any) => typeof v === "number" || !isNaN(parseFloat(v)))
        const isTemporal = values.every((v: any) => !isNaN(Date.parse(v)))
        const isCategorical = !isNumeric && !isTemporal

        if (isNumeric) acc.numeric.push(col)
        if (isTemporal) acc.temporal.push(col)
        if (isCategorical) acc.categorical.push(col)
        return acc
      },
      { numeric: [] as string[], temporal: [] as string[], categorical: [] as string[] },
    )

    // Utilisation de Gemini pour générer la configuration
    try {
      const prompt = `
      En tant qu'expert en visualisation de données 3D, génère-moi une configuration complète pour une visualisation PlotlyJS 3D.

      MODÈLE DEMANDÉ: "${userRequest}"
      DESCRIPTION: "${modelDescription || "Visualisation 3D"}"
      DONNÉES: ${data.length} points de données
      COLONNES DISPONIBLES: ${columns.join(", ")}
      - Colonnes numériques: ${columnTypes.numeric.join(", ")}
      - Colonnes temporelles: ${columnTypes.temporal.join(", ")}
      - Colonnes catégorielles: ${columnTypes.categorical.join(", ")}

      Tu dois générer un objet JavaScript complet et valide, avec une structure précise que je pourrai utiliser directement.

      Réponds UNIQUEMENT avec la configuration JSON, sans commentaires ni explications autour.

      Format requis:
      {
        "type": "${userRequest}",
        "config": {
          "data": [...], // Tableau d'objets de configuration Plotly
          "layout": {...} // Configuration du layout Plotly
        },
        "title": "Titre de la visualisation",
        "description": "Description concise de ce qui est affiché",
        "generatedCode": "// Le code JavaScript complet qui crée cette visualisation, incluant les transformations de données"
      }

      Assure-toi que la propriété "data" contient une configuration de trace Plotly valide qui utilise les données de manière optimale.
      Utilise les colonnes disponibles intelligemment selon leur type.
      Crée une visualisation impressionnante avec une belle palette de couleurs.
      Ajoute des tooltips informatifs et des effets visuels intéressants.
      `

      // Utilisation directe de l'API Google Generative AI
      console.log("Génération de visualisation avec Gemini pour le modèle:", userRequest)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

      const result = await model.generateContent(prompt)
      const response = await result.response
      const responseText = response.text()

      console.log("Réponse Gemini reçue", responseText.substring(0, 100) + "...")

      try {
        // Tenter de parser la réponse JSON
        const configResult = JSON.parse(responseText)
        console.log("Configuration générée avec succès via Gemini")
        return Response.json(configResult)
      } catch (parseError) {
        console.error("Erreur de parsing de la réponse Gemini:", parseError)

        // Fallback: Utiliser une configuration de base mais garder la description de la réponse
        const fallbackConfig = generateFallbackConfig(userRequest, data, columns)

        if (fallbackConfig) {
          fallbackConfig.generatedCode =
            "// Code de visualisation fallback généré automatiquement\n" +
            "// La génération dynamique via Gemini a rencontré une erreur de format\n"

          if (fallbackConfig.description) {
            fallbackConfig.description += "\n\n" + responseText.substring(0, 100) + "..."
          } else {
            fallbackConfig.description = responseText.substring(0, 100) + "..."
          }
        }

        return Response.json(fallbackConfig || { error: "Failed to generate visualization" })
      }
    } catch (geminiError) {
      console.error("Erreur avec Gemini:", geminiError)
      const fallbackConfig = generateFallbackConfig(userRequest, data, columns)
      return Response.json(fallbackConfig)
    }
  } catch (error) {
    console.error("Erreur API génération:", error)

    // Return a basic configuration in case of any error
    const { data, columns, userRequest } = await req.json()
    const fallbackConfig = generateFallbackConfig(userRequest || "scatter3d", data || [], columns || [])

    return Response.json(fallbackConfig)
  }
}

interface VisualizationConfig {
  type: string
  config: { data: any[]; layout: any }
  title: string
  description: string
  generatedCode?: string
}

function generateFallbackConfig(type: string, data: any[], columns: string[]): VisualizationConfig {
  const numericColumns = columns.filter((col: string) =>
    data.some((row: any) => !isNaN(parseFloat(row[col])))
  )

  const xCol = numericColumns[0] || columns[0] || "x"
  const yCol = numericColumns[1] || columns[1] || "y"
  const zCol = numericColumns[2] || columns[2] || "z"

  const trace: any = {
    type: type === "mesh3d" ? "mesh3d" : "scatter3d",
    x: data.map((row: any) => parseFloat(row[xCol]) || Math.random() * 10),
    y: data.map((row: any) => parseFloat(row[yCol]) || Math.random() * 10),
    z: data.map((row: any) => parseFloat(row[zCol]) || Math.random() * 10),
  }

  if (trace.type === "scatter3d") {
    trace.mode = "markers"
    trace.marker = {
      size: 6,
      color: data.map((_: any, i: number) => i),
      colorscale: "Viridis",
      opacity: 0.8,
    }
  } else {
    trace.intensity = data.map((_: any, i: number) => i)
    trace.colorscale = "Viridis"
    trace.opacity = 0.7
  }

  const layout = {
    scene: {
      xaxis: { title: xCol },
      yaxis: { title: yCol },
      zaxis: { title: zCol },
    },
    title: "Visualisation 3D Interactive",
    margin: { l: 0, r: 0, t: 40, b: 0 },
  }

  return {
    type: trace.type,
    config: { data: [trace], layout },
    title: "Visualisation 3D Interactive",
    description: `Analyse de ${data.length} entrées`,
  }
}

function generateSurfaceData(data: any[], numericColumns: string[]) {
  const size = Math.min(20, Math.sqrt(data.length))
  const surface = []

  for (let i = 0; i < size; i++) {
    const row = []
    for (let j = 0; j < size; j++) {
      const dataIndex = Math.floor(((i * size + j) * data.length) / (size * size))
      const value =
        data[dataIndex] && numericColumns[0]
          ? Number.parseFloat(data[dataIndex][numericColumns[0]]) || 0
          : Math.random() * 10
      row.push(value)
    }
    surface.push(row)
  }

  return surface
}
