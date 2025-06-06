export async function POST(req: Request) {
  try {
    const { data, columns, userRequest } = await req.json()

    // Always fallback to local generation since no API key is configured
    const fallbackConfig = generateFallbackConfig(userRequest, data, columns)
    return Response.json(fallbackConfig)
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
        },
        title: "Constellation de Données 3D",
        description: `Visualisation 3D de ${data.length} points`,
      }

    case "surface3d":
      return {
        type: "surface3d",
        config: {
          data: [
            {
              type: "surface",
              z: generateSurfaceData(data, numericColumns),
              colorscale: "Plasma",
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
            },
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
        title: "Surface de Données 3D",
        description: "Surface générée à partir des données",
      }

    default:
      return {
        type: "scatter3d",
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
