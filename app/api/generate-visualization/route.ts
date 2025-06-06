import { GoogleGenerativeAI } from "@google/generative-ai"

// Configuration de l'API Gemini
const apiKey = process.env.GEMINI_API_KEY || "AIzaSyB_lBRH0ja-p9-8Xzvzv8RfTU6z5QHKRWs"
const genAI = new GoogleGenerativeAI(apiKey)

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { data, columns, userRequest, modelDescription, modelRequirements } = await req.json()

    // Analyse des types de colonnes disponibles
    const columnTypes = columns.reduce((acc: any, col: string) => {
      const values = data.map((row: any) => row[col])
      const isNumeric = values.every((v: any) => typeof v === 'number' || !isNaN(parseFloat(v)))
      const isTemporal = values.every((v: any) => !isNaN(Date.parse(v)))
      const isCategorical = !isNumeric && !isTemporal

      if (isNumeric) acc.numeric.push(col)
      if (isTemporal) acc.temporal.push(col)
      if (isCategorical) acc.categorical.push(col)
      return acc
    }, { numeric: [] as string[], temporal: [] as string[], categorical: [] as string[] })

    // Utilisation de Gemini pour générer la configuration
    try {
      const prompt = `
      En tant qu'expert en visualisation de données 3D, génère-moi une configuration complète pour une visualisation PlotlyJS 3D.
      
      MODÈLE DEMANDÉ: "${userRequest}"
      DESCRIPTION: "${modelDescription || 'Visualisation 3D'}"
      DONNÉES: ${data.length} points de données
      COLONNES DISPONIBLES: ${columns.join(', ')}
      - Colonnes numériques: ${columnTypes.numeric.join(', ')}
      - Colonnes temporelles: ${columnTypes.temporal.join(', ')}
      - Colonnes catégorielles: ${columnTypes.categorical.join(', ')}
      
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
          fallbackConfig.generatedCode = "// Code de visualisation fallback généré automatiquement\n" + 
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

function generateFallbackConfig(type: string, data: any[], columns: string[]) {
  const numericColumns = columns.filter((col: string) =>
    data.some((row: any) => !isNaN(Number.parseFloat(row[col])) && isFinite(row[col])),
  )

  const xCol = numericColumns[0] || columns[0] || "x"
  const yCol = numericColumns[1] || columns[1] || "y"
  const zCol = numericColumns[2] || columns[2] || "z"

  switch (type) {
    case "scatter3d":
      return {
        type: "scatter3d",
        title: "Constellation de Données 3D",
        description: `Visualisation 3D de ${data.length} points dans l'espace`,
        generatedCode: `// Code de visualisation scatter3d générée automatiquement
function createVisualization(data) {
  const traces = [{
    type: 'scatter3d',
    mode: 'markers',
    x: data.map(row => row['${xCol}']),
    y: data.map(row => row['${yCol}']),
    z: data.map(row => row['${zCol}']),
    marker: {
      size: 5,
      color: data.map((_, i) => i),
      colorscale: 'Viridis',
      opacity: 0.8
    }
  }];

  const layout = {
    title: 'Visualisation 3D des données',
    scene: {
      xaxis: { title: '${xCol}' },
      yaxis: { title: '${yCol}' },
      zaxis: { title: '${zCol}' }
    }
  };

  return { data: traces, layout };
}`,
        config: {
          data: [
            {
              type: "scatter3d",
              mode: "markers",
              x: data.map((row) => row[xCol] || Math.random() * 10),
              y: data.map((row) => row[yCol] || Math.random() * 10),
              z: data.map((row) => row[zCol] || Math.random() * 10),
              marker: {
                size: 6,
                color: data.map((_, i) => i),
                colorscale: "Viridis",
                opacity: 0.8,
                colorbar: {
                  title: {
                    text: xCol,
                    font: { size: 10, color: "#888" },
                  },
                  thickness: 12,
                  len: 0.6,
                  x: 1.01,
                  bgcolor: "rgba(255, 255, 255, 0.8)",
                  bordercolor: "rgba(0, 0, 0, 0.1)",
                  borderwidth: 1,
                },
                line: {
                  color: "rgba(255, 255, 255, 0.1)",
                  width: 0.5,
                },
              },
              text: data.map(
                (row, i) =>
                  `Point ${i + 1}<br>${xCol}: ${row[xCol] || "N/A"}<br>${yCol}: ${row[yCol] || "N/A"}<br>${zCol}: ${row[zCol] || "N/A"}`,
              ),
              hovertemplate: "%{text}<extra></extra>",
            },
          ],
          layout: {
            scene: {
              xaxis: {
                title: xCol,
                showbackground: true,
                backgroundcolor: "rgba(240, 240, 240, 0.8)",
              },
              yaxis: {
                title: yCol,
                showbackground: true,
                backgroundcolor: "rgba(240, 240, 240, 0.8)",
              },
              zaxis: {
                title: zCol,
                showbackground: true,
                backgroundcolor: "rgba(240, 240, 240, 0.8)",
              },
              camera: { eye: { x: 1.25, y: 1.25, z: 1.25 } },
            },
            title: {
              text: "Constellation de Données 3D",
              font: { size: 18, color: "#ea580c" },
            },
            paper_bgcolor: "rgba(0,0,0,0)",
            margin: { l: 0, r: 0, t: 40, b: 0 },
            annotations: [
              {
                text: `<b>Légende:</b><br>• Couleur: ${xCol}<br>• Total: ${data.length} pts`,
                showarrow: false,
                xref: "paper",
                yref: "paper",
                x: -0.15,
                y: 0.95,
                xanchor: "left",
                yanchor: "top",
                bgcolor: "rgba(255, 255, 255, 0.7)",
                bordercolor: "rgba(234, 88, 12, 0.3)",
                borderwidth: 1,
                font: { size: 9, color: "#666" },
              },
            ],
          },
          config: {
            data: [
              {
                type: "surface", 
                colorbar: {
                  title: {
                    text: numericColumns[0] || "Valeurs",
                    font: { size: 10, color: "#888" },
                  },
                  thickness: 12,
                  len: 0.6,
                  x: 1.01,
                  bgcolor: "rgba(255, 255, 255, 0.8)",
                  bordercolor: "rgba(0, 0, 0, 0.1)",
                  borderwidth: 1,
                },
                contours: {
                  z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: "#42f462",
                    project: { z: true },
                  },
                },
                lighting: {
                  ambient: 0.4,
                  diffuse: 0.8,
                  fresnel: 0.2,
                  specular: 0.05,
                  roughness: 0.05,
                },
              }
            ],
            layout: {
              scene: {
                camera: { eye: { x: 1.87, y: 0.88, z: -0.64 } },
                aspectratio: { x: 1, y: 1, z: 0.7 },
                xaxis: { title: "Position X", showbackground: false },
                yaxis: { title: "Position Y", showbackground: false },
                zaxis: { title: numericColumns[0] || "Valeurs", showbackground: false },
              },
              title: {
                text: "Surface de Données 3D",
                font: { size: 18, color: "#ea580c" },
              },
              paper_bgcolor: "rgba(0,0,0,0)",
              margin: { l: 0, r: 0, t: 40, b: 0 },
              annotations: [
                {
                  text: `<b>Source:</b><br>• Variable: ${numericColumns[0] || "Simulée"}<br>• Points: ${data.length}`,
                  showarrow: false,
                  xref: "paper",
                  yref: "paper",
                  x: -0.15,
                  y: 0.95,
                  xanchor: "left",
                  yanchor: "top",
                  bgcolor: "rgba(255, 255, 255, 0.7)",
                  bordercolor: "rgba(234, 88, 12, 0.3)",
                  borderwidth: 1,
                  font: { size: 9, color: "#666" },
                },
              ],
            },
          },
          generatedVisualization: {
            title: "Surface de Données 3D",
            description: "Surface générée à partir des données"
          }
      }

    case "mesh3d": {
      return {
        type: "mesh3d",
        generatedCode: `// Code de visualisation mesh3d générée automatiquement
function createVisualization(data) {
  const traces = [{
    type: 'mesh3d',
    x: data.map(row => row['${xCol}']),
    y: data.map(row => row['${yCol}']),
    z: data.map(row => row['${zCol}']),
    intensity: data.map((_, i) => i),
    colorscale: 'Viridis',
    opacity: 0.8
  }];

  const layout = {
    title: 'Maillage 3D des données',
    scene: {
      xaxis: { title: '${xCol}' },
      yaxis: { title: '${yCol}' },
      zaxis: { title: '${zCol}' }
    }
  };

  return { data: traces, layout };
}`,
        config: {
          data: [{
            type: "mesh3d",
            x: data.map(row => row[xCol] || Math.random() * 10),
            y: data.map(row => row[yCol] || Math.random() * 10),
            z: data.map(row => row[zCol] || Math.random() * 10),
            intensity: data.map((_, i) => i),
            colorscale: "Viridis",
            opacity: 0.7
          }],
          layout: {
            scene: {
              xaxis: { title: xCol },
              yaxis: { title: yCol },
              zaxis: { title: zCol },
              camera: { eye: { x: 1.5, y: 1.5, z: 1.5 }}
            },
            title: { text: "Maillage 3D de Données", font: { size: 18, color: "#ea580c" }}
          }
        },
        generatedVisualization: {
          title: "Maillage 3D de Données",
          description: `Visualisation en maillage 3D de ${data.length} points connectés`
        }
      };
    }
function createVisualization(data) {
  const traces = [{
    type: 'scatter3d',
    mode: 'markers',
    x: data.map(row => row['${xCol}']),
    y: data.map(row => row['${yCol}']),
    z: data.map(row => row['${zCol}']),
    marker: {
      size: 5,
      color: data.map((_, i) => i),
      colorscale: 'Viridis',
      opacity: 0.8
    }
  }];

  const layout = {
    title: 'Visualisation 3D par défaut',
    scene: {
      xaxis: { title: '${xCol}' },
      yaxis: { title: '${yCol}' },
      zaxis: { title: '${zCol}' }
    }
  };

  return { data: traces, layout };
}`,
        config: {
          data: [
            {
              type: "scatter3d",
              mode: "markers",
              x: data.map((row) => row[xCol] || Math.random() * 10),
              y: data.map((row) => row[yCol] || Math.random() * 10),
              z: data.map((row) => row[zCol] || Math.random() * 10),
              marker: {
                size: 8,
                color: data.map((_, i) => i),
                colorscale: "Plasma",
                opacity: 0.9,
                colorbar: {
                  title: {
                    text: xCol,
                    font: { size: 10, color: "#888" },
                  },
                  thickness: 12,
                  len: 0.6,
                  x: 1.01,
                },
              },
            },
          ],
          layout: {
            scene: {
              xaxis: { title: xCol },
              yaxis: { title: yCol },
              zaxis: { title: zCol },
            },
            title: {
              text: "Visualisation 3D Interactive",
              font: { size: 18, color: "#ea580c" },
            },
            margin: { l: 0, r: 0, t: 40, b: 0 },
            annotations: [
              {
                text: `<b>Analyse:</b><br>• ${data.length} entrées`,
                showarrow: false,
                xref: "paper",
                yref: "paper",
                x: -0.15,
                y: 0.95,
                xanchor: "left",
                yanchor: "top",
                bgcolor: "rgba(255, 255, 255, 0.7)",
                bordercolor: "rgba(234, 88, 12, 0.3)",
                borderwidth: 1,
                font: { size: 9, color: "#666" },
              },
            ],
          },
        },
        title: "Visualisation 3D Interactive",
        description: `Analyse de ${data.length} entrées`,
      }
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
