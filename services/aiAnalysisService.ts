import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI("AIzaSyB_lBRH0ja-p9-8Xzvzv8RfTU6z5QHKRWs")

export interface DataAnalysis {
  dataType: "numerical" | "categorical" | "mixed" | "temporal"
  recommendedVisualization: "bar" | "line" | "scatter" | "pie" | "heatmap"
  insights: string[]
  summary: string
  keyColumns: string[]
}

export async function analyzeDataWithAI(data: any[], columns: string[]): Promise<DataAnalysis> {
  try {
    // Analyse locale des données pour déterminer les types
    const numericColumns: string[] = []
    const categoricalColumns: string[] = []
    const temporalColumns: string[] = []

    columns.forEach((column) => {
      const sampleValues = data.slice(0, 10).map((row) => row[column])

      // Vérifier si c'est numérique
      const numericCount = sampleValues.filter((val) => !isNaN(Number.parseFloat(val)) && isFinite(val)).length

      // Vérifier si c'est temporel
      const dateCount = sampleValues.filter((val) => {
        const date = new Date(val)
        return !isNaN(date.getTime())
      }).length

      if (numericCount > sampleValues.length * 0.7) {
        numericColumns.push(column)
      } else if (dateCount > sampleValues.length * 0.7) {
        temporalColumns.push(column)
      } else {
        categoricalColumns.push(column)
      }
    })

    // Déterminer le type de données principal
    let dataType: DataAnalysis["dataType"] = "mixed"
    if (numericColumns.length > categoricalColumns.length) {
      dataType = "numerical"
    } else if (categoricalColumns.length > numericColumns.length) {
      dataType = "categorical"
    } else if (temporalColumns.length > 0) {
      dataType = "temporal"
    }

    // Recommander une visualisation basée sur l'analyse
    let recommendedVisualization: DataAnalysis["recommendedVisualization"] = "bar"

    if (dataType === "numerical" && numericColumns.length >= 2) {
      recommendedVisualization = "scatter"
    } else if (dataType === "temporal") {
      recommendedVisualization = "line"
    } else if (dataType === "categorical") {
      const uniqueValues = new Set(data.map((row) => row[categoricalColumns[0]])).size
      recommendedVisualization = uniqueValues <= 8 ? "pie" : "bar"
    }

    // Préparer un échantillon de données pour l'IA
    const sampleData = data.slice(0, 5)
    const dataPreview = JSON.stringify(sampleData, null, 2)

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const prompt = `
    Analysez ces données CSV et fournissez des insights:
    
    Colonnes: ${columns.join(", ")}
    Colonnes numériques: ${numericColumns.join(", ")}
    Colonnes catégorielles: ${categoricalColumns.join(", ")}
    Type de données détecté: ${dataType}
    Visualisation recommandée: ${recommendedVisualization}
    
    Échantillon de données:
    ${dataPreview}
    
    Fournissez une réponse JSON avec:
    - insights: array de 3-5 observations importantes
    - summary: résumé en 1-2 phrases
    - keyColumns: colonnes les plus importantes pour la visualisation
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    try {
      // Essayer de parser la réponse JSON
      const aiAnalysis = JSON.parse(text)

      return {
        dataType,
        recommendedVisualization,
        insights: aiAnalysis.insights || [
          `Dataset contient ${data.length} entrées avec ${columns.length} colonnes`,
          `Type de données principal: ${dataType}`,
          `Colonnes numériques: ${numericColumns.length}`,
          `Colonnes catégorielles: ${categoricalColumns.length}`,
        ],
        summary:
          aiAnalysis.summary || `Analyse de ${data.length} entrées avec ${columns.length} colonnes de type ${dataType}`,
        keyColumns: aiAnalysis.keyColumns || [...numericColumns.slice(0, 2), ...categoricalColumns.slice(0, 1)],
      }
    } catch (parseError) {
      // Si le parsing JSON échoue, utiliser l'analyse locale
      return {
        dataType,
        recommendedVisualization,
        insights: [
          `Dataset contient ${data.length} entrées avec ${columns.length} colonnes`,
          `Type de données principal: ${dataType}`,
          `Colonnes numériques détectées: ${numericColumns.join(", ") || "Aucune"}`,
          `Colonnes catégorielles détectées: ${categoricalColumns.join(", ") || "Aucune"}`,
          `Visualisation recommandée: ${recommendedVisualization}`,
        ],
        summary: `Analyse automatique de ${data.length} entrées avec ${columns.length} colonnes de type ${dataType}`,
        keyColumns: [...numericColumns.slice(0, 2), ...categoricalColumns.slice(0, 1)],
      }
    }
  } catch (error) {
    console.error("Erreur lors de l'analyse IA:", error)

    // Retourner une analyse de base en cas d'erreur
    return {
      dataType: "mixed",
      recommendedVisualization: "bar",
      insights: [
        `Dataset contient ${data.length} entrées`,
        `${columns.length} colonnes détectées`,
        "Analyse automatique en cours...",
      ],
      summary: `Analyse de base de ${data.length} entrées`,
      keyColumns: columns.slice(0, 3),
    }
  }
}

export async function generateVisualizationSuggestion(
  data: any[],
  columns: string[],
  userRequest: string,
): Promise<string> {
  try {
    const model = genAI.getGenerativeAI({ model: "gemini-pro" })

    const prompt = `
    L'utilisateur a des données CSV avec les colonnes: ${columns.join(", ")}
    Il demande: "${userRequest}"
    
    Recommandez le meilleur type de visualisation parmi: bar, line, scatter, pie
    Répondez avec juste le nom du type (bar, line, scatter, ou pie).
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const suggestion = response.text().trim().toLowerCase()

    // Valider la réponse
    const validTypes = ["bar", "line", "scatter", "pie"]
    return validTypes.includes(suggestion) ? suggestion : "bar"
  } catch (error) {
    console.error("Erreur lors de la génération de suggestion:", error)
    return "bar" // Valeur par défaut
  }
}
