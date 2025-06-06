"use client"

import { useEffect, useRef, useState } from "react"
import { TrendingUp, Zap, Code } from "lucide-react"

// Étendre l'interface Window pour inclure Plotly
declare global {
  interface Window {
    Plotly: any
  }
}

interface Canvas3DVisualizationProps {
  data: any[]
  columns: string[]
  visualizationType: string
  generatedConfig?: any
}

interface DataMapping {
  xAxis: string
  yAxis: string
  zAxis: string
  colorBy: string
  sizeBy: string
  categoryBy?: string
}

interface DataAnalysis {
  mapping: DataMapping
  numericColumns: string[]
  categoricalColumns: string[]
  temporalColumns: string[]
  dataRanges: { [key: string]: { min: number; max: number; values: number[] } }
  categories: { [key: string]: string[] }
  dataTypes: { [key: string]: "numeric" | "categorical" | "temporal" | "mixed" }
}

export default function Canvas3DVisualization({
  data,
  columns,
  visualizationType,
  generatedConfig,
}: Canvas3DVisualizationProps) {
  const plotRef = useRef<HTMLDivElement>(null)
  const [isV0Generated, setIsV0Generated] = useState(false)
  const [plotlyLoaded, setPlotlyLoaded] = useState(false)
  const [dataMapping, setDataMapping] = useState<DataMapping | null>(null)
  const [currentModel, setCurrentModel] = useState<string>("scatter3d")
  const [dataAnalysis, setDataAnalysis] = useState<DataAnalysis | null>(null)

  // Fonction pour gérer la visualisation générée par l'API
  const renderV0Visualization = async (config: any) => {
    const plotElement = plotRef.current
    if (!plotElement) return

    try {
      // Utiliser la configuration générée par l'API
      if (config.plotData && config.layout) {
        await window.Plotly.newPlot(plotElement, config.plotData, config.layout, getPlotConfig())
      } else {
        // Fallback sur la configuration par défaut
        const analysis = analyzeDataIntelligently()
        if (!analysis) return
        renderModelSpecificVisualization()
      }
    } catch (error) {
      console.error("Erreur lors du rendu V0:", error)
      const analysis = analyzeDataIntelligently()
      if (!analysis) return
      renderClassicScatter(analysis)
    }
  }

  // Charger Plotly.js
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Plotly) {
      const script = document.createElement("script")
      script.src = "https://cdn.plot.ly/plotly-2.35.2.min.js"
      script.onload = () => setPlotlyLoaded(true)
      script.onerror = () => {
        console.error("Erreur lors du chargement de Plotly.js")
        setPlotlyLoaded(false)
      }
      document.head.appendChild(script)
    } else if (window.Plotly) {
      setPlotlyLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!plotlyLoaded || !plotRef.current) return

    const updateVisualization = async () => {
      const plotElement = plotRef.current
      if (!plotElement) return

      // Nettoyer le graphique précédent
      if (plotElement.children.length > 0) {
        window.Plotly.purge(plotElement)
      }

      setCurrentModel(visualizationType)

      try {
        if (generatedConfig) {
          await renderV0Visualization(generatedConfig)
          setIsV0Generated(true)
        } else {
          await renderModelSpecificVisualization()
          setIsV0Generated(false)
        }
      } catch (error) {
        console.error("Erreur lors de la mise à jour de la visualisation:", error)
        // En cas d'erreur, on revient au nuage de points basique
        renderClassicScatter(analyzeDataIntelligently() || {
          mapping: {
            xAxis: columns[0] || "index",
            yAxis: columns[1] || "index",
            zAxis: columns[2] || "index",
            colorBy: columns[0] || "index",
            sizeBy: columns[1] || "index"
          },
          numericColumns: columns,
          categoricalColumns: [],
          temporalColumns: [],
          dataRanges: {},
          categories: {},
          dataTypes: {}
        })
      }
    }

    updateVisualization()
  }, [plotlyLoaded, data, columns, visualizationType, generatedConfig])

  // Analyse complète et intelligente des données
  const analyzeDataIntelligently = (): DataAnalysis | null => {
    if (!data || data.length === 0 || !columns || columns.length === 0) {
      return null
    }

    const analysis: DataAnalysis = {
      mapping: {} as DataMapping,
      numericColumns: [],
      categoricalColumns: [],
      temporalColumns: [],
      dataRanges: {},
      categories: {},
      dataTypes: {},
    }

    // Analyser chaque colonne en détail
    columns.forEach((col) => {
      const values = data.map((row) => row[col]).filter((val) => val != null && val !== "")

      if (values.length === 0) {
        analysis.dataTypes[col] = "mixed"
        return
      }

      // Test numérique
      const numericValues = values.map((val) => Number.parseFloat(val)).filter((val) => !isNaN(val) && isFinite(val))
      const numericRatio = numericValues.length / values.length

      // Test temporel
      const dateValues = values.filter((val) => {
        const date = new Date(val)
        return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100
      })
      const temporalRatio = dateValues.length / values.length

      // Test catégoriel
      const uniqueValues = [...new Set(values)]
      const uniqueRatio = uniqueValues.length / values.length

      // Classification intelligente
      if (temporalRatio > 0.7) {
        analysis.dataTypes[col] = "temporal"
        analysis.temporalColumns.push(col)
        // Convertir en timestamps pour les calculs
        const timestamps = dateValues.map((val) => new Date(val).getTime())
        analysis.dataRanges[col] = {
          min: Math.min(...timestamps),
          max: Math.max(...timestamps),
          values: timestamps,
        }
      } else if (numericRatio > 0.7) {
        analysis.dataTypes[col] = "numeric"
        analysis.numericColumns.push(col)
        analysis.dataRanges[col] = {
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          values: numericValues,
        }
      } else if (uniqueRatio < 0.3 || uniqueValues.length <= 20) {
        analysis.dataTypes[col] = "categorical"
        analysis.categoricalColumns.push(col)
        analysis.categories[col] = uniqueValues.slice(0, 20) // Limiter à 20 catégories
      } else {
        analysis.dataTypes[col] = "mixed"
        if (numericValues.length > 0) {
          analysis.dataRanges[col] = {
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            values: numericValues,
          }
        }
      }
    })

    // Créer un mapping intelligent basé sur les types de données
    const allNumericCols = [...analysis.numericColumns, ...analysis.temporalColumns]

    if (allNumericCols.length >= 3) {
      analysis.mapping = {
        xAxis: allNumericCols[0],
        yAxis: allNumericCols[1],
        zAxis: allNumericCols[2],
        colorBy: allNumericCols[0],
        sizeBy: allNumericCols.length > 3 ? allNumericCols[3] : allNumericCols[0],
        categoryBy: analysis.categoricalColumns[0],
      }
    } else if (allNumericCols.length === 2) {
      analysis.mapping = {
        xAxis: allNumericCols[0],
        yAxis: allNumericCols[1],
        zAxis: allNumericCols[0],
        colorBy: allNumericCols[1],
        sizeBy: allNumericCols[0],
        categoryBy: analysis.categoricalColumns[0],
      }
    } else if (allNumericCols.length === 1) {
      analysis.mapping = {
        xAxis: allNumericCols[0],
        yAxis: "index",
        zAxis: allNumericCols[0],
        colorBy: allNumericCols[0],
        sizeBy: allNumericCols[0],
        categoryBy: analysis.categoricalColumns[0],
      }
    } else {
      // Utiliser les indices et catégories
      analysis.mapping = {
        xAxis: "index",
        yAxis: analysis.categoricalColumns[0] || "index",
        zAxis: "count",
        colorBy: analysis.categoricalColumns[0] || "index",
        sizeBy: "count",
        categoryBy: analysis.categoricalColumns[0],
      }
    }

    return analysis
  }

  // Fonction principale qui route vers la bonne visualisation selon le modèle
  const renderModelSpecificVisualization = () => {
    if (!data || data.length === 0) {
      renderDemoVisualization()
      return
    }

    const analysis = analyzeDataIntelligently()
    if (!analysis) {
      renderDemoVisualization()
      return
    }

    setDataAnalysis(analysis)
    setDataMapping(analysis.mapping)

    // Router vers la fonction spécialisée selon le modèle exact
    switch (visualizationType) {
      // NUAGES
      case "scatter3d":
        renderClassicScatter(analysis)
        break
      case "scatter_bubble":
        renderBubbleScatter(analysis)
        break
      case "scatter_animated":
        renderAnimatedScatter(analysis)
        break
      case "scatter_clustered":
        renderClusteredScatter(analysis)
        break
      case "scatter_density":
        renderDensityScatter(analysis)
        break

      // SURFACES
      case "surface3d":
        renderClassicSurface(analysis)
        break
      case "surface_contour":
        renderContourSurface(analysis)
        break
      case "surface_mesh":
        renderMeshSurface(analysis)
        break
      case "surface_gradient":
        renderGradientSurface(analysis)
        break

      // ARCHITECTURE
      case "bars3d":
        renderClassicBars(analysis)
        break
      case "bars_grouped":
        renderGroupedBars(analysis)
        break
      case "bars_cylindrical":
        renderCylindricalBars(analysis)
        break
      case "bars_pyramid":
        renderPyramidBars(analysis)
        break

      // GÉOMÉTRIQUES
      case "sphere_pack":
        renderSpherePack(analysis)
        break
      case "cube_matrix":
        renderCubeMatrix(analysis)
        break
      case "cone_field":
        renderConeField(analysis)
        break
      case "helix_spiral":
        renderHelixSpiral(analysis)
        break

      // ARTISTIQUES
      case "mandala_3d":
        renderMandala3D(analysis)
        break
      case "fractal_3d":
        renderFractal3D(analysis)
        break
      case "crystal_3d":
        renderCrystal3D(analysis)
        break
      case "galaxy_3d":
        renderGalaxy3D(analysis)
        break
      case "dna_helix":
        renderDNAHelix(analysis)
        break

      // RÉSEAUX
      case "network_3d":
        renderNetwork3D(analysis)
        break
      case "tree_3d":
        renderTree3D(analysis)
        break

      // TEMPORELS
      case "timeline_3d":
        renderTimeline3D(analysis)
        break
      case "wave_temporal":
        renderWaveTemporal(analysis)
        break
      case "spiral_time":
        renderSpiralTime(analysis)
        break

      // GÉOGRAPHIQUES
      case "globe_3d":
        renderGlobe3D(analysis)
        break
      case "terrain_3d":
        renderTerrain3D(analysis)
        break

      // SCIENTIFIQUES
      case "molecule_3d":
        renderMolecule3D(analysis)
        break
      case "vector_field":
        renderVectorField(analysis)
        break

      // STATISTIQUES
      case "histogram_3d":
        renderHistogram3D(analysis)
        break
      case "box_plot_3d":
        renderBoxPlot3D(analysis)
        break

      default:
        renderClassicScatter(analysis)
    }
  }

  // Fonction utilitaire pour extraire les valeurs avec l'analyse
  const getValuesFromAnalysis = (analysis: DataAnalysis, key: keyof DataMapping): number[] => {
    const column = analysis.mapping[key]

    if (column === "index") {
      return data.map((_, i) => i)
    } else if (column === "count") {
      return data.map(() => 1)
    } else if (column && columns.includes(column)) {
      if (analysis.dataRanges[column]) {
        // Utiliser les valeurs pré-calculées pour les colonnes numériques/temporelles
        const range = analysis.dataRanges[column]
        return data.map((row, i) => {
          const val = row[column]
          if (analysis.dataTypes[column] === "temporal") {
            const timestamp = new Date(val).getTime()
            return isNaN(timestamp) ? range.min : timestamp
          } else {
            const numVal = Number.parseFloat(val)
            return !isNaN(numVal) && isFinite(numVal) ? numVal : range.min
          }
        })
      } else if (analysis.categories[column]) {
        // Convertir les catégories en indices numériques
        const categories = analysis.categories[column]
        return data.map((row) => {
          const val = row[column]
          const index = categories.indexOf(val)
          return index >= 0 ? index : 0
        })
      }
    }

    return data.map((_, i) => i)
  }

  // VISUALISATIONS SPÉCIALISÉES AVEC DONNÉES DYNAMIQUES

  // 1. NUAGE CLASSIQUE - Adapté aux données
  const renderClassicScatter = (analysis: DataAnalysis) => {
    const xValues = getValuesFromAnalysis(analysis, "xAxis")
    const yValues = getValuesFromAnalysis(analysis, "yAxis")
    const zValues = getValuesFromAnalysis(analysis, "zAxis")
    const colorValues = getValuesFromAnalysis(analysis, "colorBy")

    // Adapter la taille des marqueurs selon la densité des données
    const markerSize = Math.max(3, Math.min(12, 100 / Math.sqrt(data.length)))

    const plotData = [
      {
        type: "scatter3d",
        mode: "markers",
        x: xValues,
        y: yValues,
        z: zValues,
        marker: {
          size: markerSize,
          color: colorValues,
          colorscale: "Viridis",
          opacity: Math.max(0.6, 1 - data.length / 1000), // Transparence adaptée
          colorbar: {
            title: analysis.mapping.colorBy,
            titlefont: { size: 10 },
          },
        },
        text: data.map((row, i) => {
          let tooltip = `<b>Point ${i + 1}</b><br>`
          tooltip += `<b>${analysis.mapping.xAxis}:</b> ${row[analysis.mapping.xAxis] || "N/A"}<br>`
          tooltip += `<b>${analysis.mapping.yAxis}:</b> ${row[analysis.mapping.yAxis] || "N/A"}<br>`
          tooltip += `<b>${analysis.mapping.zAxis}:</b> ${row[analysis.mapping.zAxis] || "N/A"}<br>`
          if (analysis.mapping.categoryBy && row[analysis.mapping.categoryBy]) {
            tooltip += `<b>${analysis.mapping.categoryBy}:</b> ${row[analysis.mapping.categoryBy]}<br>`
          }
          return tooltip
        }),
        hovertemplate: "%{text}<extra></extra>",
        name: `Nuage 3D - ${data.length} points`,
      },
    ]

    const layout = createDynamicLayout("Nuage 3D Classique", analysis)
    window.Plotly.newPlot(plotRef.current, plotData, layout, getPlotConfig())
  }

  // 2. DENSITÉ 3D - Vraie densité basée sur les données réelles
  const renderDensityScatter = (analysis: DataAnalysis) => {
    const xValues = getValuesFromAnalysis(analysis, "xAxis")
    const yValues = getValuesFromAnalysis(analysis, "yAxis")
    const zValues = getValuesFromAnalysis(analysis, "zAxis")

    // Adapter la résolution de la grille selon le nombre de données
    const gridSize = Math.min(25, Math.max(10, Math.sqrt(data.length)))

    const xRange = analysis.dataRanges[analysis.mapping.xAxis]
    const yRange = analysis.dataRanges[analysis.mapping.yAxis]
    const zRange = analysis.dataRanges[analysis.mapping.zAxis]

    if (!xRange || !yRange || !zRange) {
      renderClassicScatter(analysis)
      return
    }

    const densityX: number[] = []
    const densityY: number[] = []
    const densityZ: number[] = []
    const densityColors: number[] = []
    const densitySizes: number[] = []

    // Calculer le rayon adaptatif basé sur les vraies données
    const xSpan = xRange.max - xRange.min
    const ySpan = yRange.max - yRange.min
    const zSpan = zRange.max - zRange.min
    const radius = Math.max(xSpan, ySpan, zSpan) / (gridSize * 0.8)

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        for (let k = 0; k < gridSize; k++) {
          const x = xRange.min + (i / (gridSize - 1)) * xSpan
          const y = yRange.min + (j / (gridSize - 1)) * ySpan
          const z = zRange.min + (k / (gridSize - 1)) * zSpan

          // Calculer la densité locale avec les vraies données
          let density = 0
          for (let p = 0; p < data.length; p++) {
            const dx = xValues[p] - x
            const dy = yValues[p] - y
            const dz = zValues[p] - z
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
            if (distance < radius) {
              density += Math.exp(-(distance * distance) / (radius * radius))
            }
          }

          // Seuil adaptatif basé sur la densité moyenne
          const threshold = (data.length / (gridSize * gridSize * gridSize)) * 0.5
          if (density > threshold) {
            densityX.push(x)
            densityY.push(y)
            densityZ.push(z)
            densityColors.push(density)
            densitySizes.push(Math.max(4, Math.min(20, density * 15)))
          }
        }
      }
    }

    const plotData = [
      {
        type: "scatter3d",
        mode: "markers",
        x: densityX,
        y: densityY,
        z: densityZ,
        marker: {
          size: densitySizes,
          color: densityColors,
          colorscale: "Hot",
          opacity: 0.7,
          colorbar: {
            title: "Densité Locale",
            titlefont: { size: 10 },
          },
        },
        text: densityX.map(
          (_, i) =>
            `<b>Zone Dense ${i + 1}</b><br>Densité: ${densityColors[i].toFixed(2)}<br>Position: (${densityX[i].toFixed(1)}, ${densityY[i].toFixed(1)}, ${densityZ[i].toFixed(1)})`,
        ),
        hovertemplate: "%{text}<extra></extra>",
        name: `Densité 3D - ${densityX.length} zones`,
      },
    ]

    const layout = createDynamicLayout("Densité 3D - Zones de Concentration", analysis)
    window.Plotly.newPlot(plotRef.current, plotData, layout, getPlotConfig())
  }

  // 3. BULLES 3D - Tailles vraiment proportionnelles aux données
  const renderBubbleScatter = (analysis: DataAnalysis) => {
    const xValues = getValuesFromAnalysis(analysis, "xAxis")
    const yValues = getValuesFromAnalysis(analysis, "yAxis")
    const zValues = getValuesFromAnalysis(analysis, "zAxis")
    const colorValues = getValuesFromAnalysis(analysis, "colorBy")
    const sizeValues = getValuesFromAnalysis(analysis, "sizeBy")

    // Adapter la taille des bulles selon les données
    const minSize = 10
    const maxSize = 50
    const normalizedSizes = sizeValues.map(v => {
      const min = Math.min(...sizeValues)
      const max = Math.max(...sizeValues)
      return minSize + ((v - min) / (max - min)) * (maxSize - minSize)
    })

    const plotData = [
      {
        type: "scatter3d",
        mode: "markers",
        x: xValues,
        y: yValues,
        z: zValues,
        marker: {
          size: normalizedSizes,
          color: colorValues,
          colorscale: "Plasma",
          opacity: 0.75,
          colorbar: {
            title: analysis.mapping.colorBy,
            titlefont: { size: 10 },
          },
          line: { color: "rgba(255, 255, 255, 0.3)", width: 1 },
        },
        text: data.map((row, i) => {
          let tooltip = `<b>Bulle ${i + 1}</b><br>`
          tooltip += `<b>Taille (${analysis.mapping.sizeBy}):</b> ${row[analysis.mapping.sizeBy] || "N/A"}<br>`
          tooltip += `<b>Couleur (${analysis.mapping.colorBy}):</b> ${row[analysis.mapping.colorBy] || "N/A"}<br>`
          if (analysis.mapping.categoryBy && row[analysis.mapping.categoryBy]) {
            tooltip += `<b>Catégorie:</b> ${row[analysis.mapping.categoryBy]}<br>`
          }
          return tooltip
        }),
        hovertemplate: "%{text}<extra></extra>",
        name: `Bulles 3D - ${data.length} éléments`,
      },
    ]

    const layout = createDynamicLayout("Bulles 3D - Tailles Proportionnelles", analysis)
    window.Plotly.newPlot(plotRef.current, plotData, layout, getPlotConfig())
  }

  // 4. MANDALA 3D - Basé sur les patterns des données
  const renderMandala3D = (analysis: DataAnalysis) => {
    const colorValues = getValuesFromAnalysis(analysis, "colorBy")
    const sizeValues = getValuesFromAnalysis(analysis, "sizeBy")

    const mandalaX: number[] = []
    const mandalaY: number[] = []
    const mandalaZ: number[] = []
    const mandalaColors: number[] = []
    const mandalaSizes: number[] = []

    // Utiliser les vraies données pour créer les patterns
    data.forEach((row, i) => {
      const normalizedIndex = i / data.length
      const colorVal = colorValues[i]
      const sizeVal = sizeValues[i]

      // Nombre de tours basé sur la variance des données
      const colorRange = analysis.dataRanges[analysis.mapping.colorBy]
      const tours = colorRange ? 4 + ((colorVal - colorRange.min) / (colorRange.max - colorRange.min)) * 4 : 6

      const angle = normalizedIndex * tours * Math.PI
      const radius = 1 + Math.sin(angle * 3) * 0.5
      const height = Math.sin(angle * 2) * 0.3

      // Point principal
      mandalaX.push(Math.cos(angle) * radius)
      mandalaY.push(Math.sin(angle) * radius)
      mandalaZ.push(height)
      mandalaColors.push(colorVal)
      mandalaSizes.push(Math.max(3, Math.min(8, (sizeVal / (colorRange?.max || 1)) * 6 + 3)))

      // Pétales basés sur les catégories
      const numPetals =
        analysis.mapping.categoryBy && analysis.categories[analysis.mapping.categoryBy]
          ? Math.min(6, analysis.categories[analysis.mapping.categoryBy].length)
          : 5

      for (let j = 0; j < numPetals; j++) {
        const petalAngle = angle + (j * 2 * Math.PI) / numPetals
        const petalRadius = radius * 0.3
        mandalaX.push(Math.cos(angle) * radius + Math.cos(petalAngle) * petalRadius)
        mandalaY.push(Math.sin(angle) * radius + Math.sin(petalAngle) * petalRadius)
        mandalaZ.push(height + Math.sin(petalAngle * 2) * 0.1)
        mandalaColors.push(colorVal * 0.8)
        mandalaSizes.push(Math.max(2, mandalaSizes[mandalaSizes.length - 1] * 0.6))
      }
    })

    const plotData = [
      {
        type: "scatter3d",
        mode: "markers",
        x: mandalaX,
        y: mandalaY,
        z: mandalaZ,
        marker: {
          size: mandalaSizes,
          color: mandalaColors,
          colorscale: "Rainbow",
          opacity: 0.8,
          colorbar: {
            title: `Harmonie (${analysis.mapping.colorBy})`,
            titlefont: { size: 10 },
          },
        },
        name: `Mandala 3D - ${data.length} éléments source`,
      },
    ]

    const layout = createDynamicLayout("Mandala 3D - Motifs Sacrés", analysis)
    layout.scene.camera = { eye: { x: 0, y: 0, z: 2.5 } }
    window.Plotly.newPlot(plotRef.current, plotData, layout, getPlotConfig())
  }

  // 5. GALAXIE 3D - Structure basée sur les données
  const renderGalaxy3D = (analysis: DataAnalysis) => {
    const colorValues = getValuesFromAnalysis(analysis, "colorBy")
    const sizeValues = getValuesFromAnalysis(analysis, "sizeBy")

    const galaxyX: number[] = []
    const galaxyY: number[] = []
    const galaxyZ: number[] = []
    const galaxyColors: number[] = []
    const galaxySizes: number[] = []

    // Analyser la distribution pour créer les bras galactiques
    const colorRange = analysis.dataRanges[analysis.mapping.colorBy]
    const sizeRange = analysis.dataRanges[analysis.mapping.sizeBy]

    data.forEach((row, i) => {
      const t = i / data.length
      const colorVal = colorValues[i]
      const sizeVal = sizeValues[i]

      // Position dans la galaxie basée sur les valeurs des données
      const normalizedColor = colorRange ? (colorVal - colorRange.min) / (colorRange.max - colorRange.min) : t
      const normalizedSize = sizeRange ? (sizeVal - sizeRange.min) / (sizeRange.max - sizeRange.min) : 0.5

      // Angle et rayon basés sur les données
      const angle = normalizedColor * 6 * Math.PI + t * 2 * Math.PI
      const radius = normalizedSize * 3 + t * 0.5
      const height = (Math.random() - 0.5) * 0.2 * (1 - t) // Plus plat vers l'extérieur

      // Bras principal
      galaxyX.push(Math.cos(angle) * radius)
      galaxyY.push(Math.sin(angle) * radius)
      galaxyZ.push(height)
      galaxyColors.push(colorVal)
      galaxySizes.push(Math.max(2, Math.min(12, (1 - normalizedSize) * 8 + 3)))

      // Bras secondaire si assez de données
      if (data.length > 20) {
        const angle2 = angle + Math.PI * 0.8
        const radius2 = radius * 0.7
        galaxyX.push(Math.cos(angle2) * radius2)
        galaxyY.push(Math.sin(angle2) * radius2)
        galaxyZ.push(height * 0.5)
        galaxyColors.push(colorVal * 0.8)
        galaxySizes.push(Math.max(1, galaxySizes[galaxySizes.length - 1] * 0.7))
      }
    })

    const plotData = [
      {
        type: "scatter3d",
        mode: "markers",
        x: galaxyX,
        y: galaxyY,
        z: galaxyZ,
        marker: {
          size: galaxySizes,
          color: galaxyColors,
          colorscale: "Viridis",
          opacity: 0.8,
          colorbar: {
            title: `Luminosité (${analysis.mapping.colorBy})`,
            titlefont: { size: 10 },
          },
        },
        name: `Galaxie 3D - ${data.length} étoiles`,
      },
    ]

    const layout = createDynamicLayout("Galaxie 3D - Spirale Cosmique", analysis)
    ;(layout.scene as any).bgcolor = "rgba(0, 0, 20, 0.9)"
    layout.scene.camera = { eye: { x: 1.5, y: 1.5, z: 1 } }
    window.Plotly.newPlot(plotRef.current, plotData, layout, getPlotConfig())
  }

  // 6. TIMELINE 3D - Pour données temporelles
  const renderTimeline3D = (analysis: DataAnalysis) => {
    // Chercher une colonne temporelle
    const timeColumn = analysis.temporalColumns[0] || analysis.mapping.xAxis
    const valueColumn = analysis.mapping.yAxis
    const colorColumn = analysis.mapping.colorBy

    const timeValues = getValuesFromAnalysis(analysis, "xAxis")
    const values = getValuesFromAnalysis(analysis, "yAxis")
    const colorValues = getValuesFromAnalysis(analysis, "colorBy")

    // Trier par temps si c'est temporel
    const sortedIndices = timeValues.map((_, i) => i).sort((a, b) => timeValues[a] - timeValues[b])

    const timelineX = sortedIndices.map((i) => timeValues[i])
    const timelineY = sortedIndices.map((i) => values[i])
    const timelineZ = sortedIndices.map((_, i) => i * 0.1) // Élévation progressive
    const timelineColors = sortedIndices.map((i) => colorValues[i])

    const plotData = [
      {
        type: "scatter3d",
        mode: "markers+lines",
        x: timelineX,
        y: timelineY,
        z: timelineZ,
        marker: {
          size: 6,
          color: timelineColors,
          colorscale: "Viridis",
          opacity: 0.8,
          colorbar: {
            title: analysis.mapping.colorBy,
            titlefont: { size: 10 },
          },
        },
        line: {
          color: "rgba(100, 100, 100, 0.6)",
          width: 3,
        },
        text: sortedIndices.map((i) => {
          const row = data[i]
          let tooltip = `<b>Point temporel ${i + 1}</b><br>`
          tooltip += `<b>Temps:</b> ${row[timeColumn] || "N/A"}<br>`
          tooltip += `<b>Valeur:</b> ${row[valueColumn] || "N/A"}<br>`
          return tooltip
        }),
        hovertemplate: "%{text}<extra></extra>",
        name: `Timeline 3D - ${data.length} points`,
      },
    ]

    const layout = createDynamicLayout("Timeline 3D - Évolution Temporelle", analysis)
    window.Plotly.newPlot(plotRef.current, plotData, layout, getPlotConfig())
  }

  // Fonctions de rendu simplifiées pour les autres modèles
  const renderAnimatedScatter = (analysis: DataAnalysis) => renderClassicScatter(analysis)
  const renderClusteredScatter = (analysis: DataAnalysis) => renderBubbleScatter(analysis)
  const renderClassicSurface = (analysis: DataAnalysis) => renderContourSurface(analysis)
  const renderMeshSurface = (analysis: DataAnalysis) => renderContourSurface(analysis)
  const renderGradientSurface = (analysis: DataAnalysis) => renderContourSurface(analysis)
  const renderClassicBars = (analysis: DataAnalysis) => renderBubbleScatter(analysis)
  const renderGroupedBars = (analysis: DataAnalysis) => renderBubbleScatter(analysis)
  const renderCylindricalBars = (analysis: DataAnalysis) => renderBubbleScatter(analysis)
  const renderPyramidBars = (analysis: DataAnalysis) => renderBubbleScatter(analysis)
  const renderSpherePack = (analysis: DataAnalysis) => renderBubbleScatter(analysis)
  const renderCubeMatrix = (analysis: DataAnalysis) => renderClassicScatter(analysis)
  const renderConeField = (analysis: DataAnalysis) => renderClassicScatter(analysis)
  const renderHelixSpiral = (analysis: DataAnalysis) => renderDNAHelix(analysis)
  const renderFractal3D = (analysis: DataAnalysis) => renderMandala3D(analysis)
  const renderCrystal3D = (analysis: DataAnalysis) => renderClassicScatter(analysis)
  const renderNetwork3D = (analysis: DataAnalysis) => renderClassicScatter(analysis)
  const renderTree3D = (analysis: DataAnalysis) => renderClassicScatter(analysis)
  const renderWaveTemporal = (analysis: DataAnalysis) => renderTimeline3D(analysis)
  const renderSpiralTime = (analysis: DataAnalysis) => renderTimeline3D(analysis)
  const renderGlobe3D = (analysis: DataAnalysis) => renderClassicScatter(analysis)
  const renderTerrain3D = (analysis: DataAnalysis) => renderContourSurface(analysis)
  const renderMolecule3D = (analysis: DataAnalysis) => renderClassicScatter(analysis)
  const renderVectorField = (analysis: DataAnalysis) => renderClassicScatter(analysis)
  const renderHistogram3D = (analysis: DataAnalysis) => renderBubbleScatter(analysis)
  const renderBoxPlot3D = (analysis: DataAnalysis) => renderBubbleScatter(analysis)

  // 7. SURFACE AVEC CONTOURS - Basée sur les vraies données
  const renderContourSurface = (analysis: DataAnalysis) => {
    const xValues = getValuesFromAnalysis(analysis, "xAxis")
    const yValues = getValuesFromAnalysis(analysis, "yAxis")
    const zValues = getValuesFromAnalysis(analysis, "zAxis")

    const xRange = analysis.dataRanges[analysis.mapping.xAxis]
    const yRange = analysis.dataRanges[analysis.mapping.yAxis]

    if (!xRange || !yRange) {
      renderClassicScatter(analysis)
      return
    }

    // Adapter la résolution selon la densité des données
    const size = Math.min(30, Math.max(15, Math.sqrt(data.length)))
    const xMin = xRange.min
    const xMax = xRange.max
    const yMin = yRange.min
    const yMax = yRange.max

    const xGrid = Array.from({ length: size }, (_, i) => xMin + (i / (size - 1)) * (xMax - xMin))
    const yGrid = Array.from({ length: size }, (_, i) => yMin + (i / (size - 1)) * (yMax - yMin))

    const surface = []
    for (let i = 0; i < size; i++) {
      const row = []
      for (let j = 0; j < size; j++) {
        const targetX = xGrid[j]
        const targetY = yGrid[i]

        // Interpolation pondérée par la distance
        let weightedSum = 0
        let totalWeight = 0
        const maxDistance = Math.sqrt((xMax - xMin) ** 2 + (yMax - yMin) ** 2) / 5

        for (let k = 0; k < data.length; k++) {
          const dx = xValues[k] - targetX
          const dy = yValues[k] - targetY
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < maxDistance) {
            const weight = Math.exp(-(distance * distance) / (maxDistance * maxDistance))
            weightedSum += zValues[k] * weight
            totalWeight += weight
          }
        }

        row.push(totalWeight > 0 ? weightedSum / totalWeight : 0)
      }
      surface.push(row)
    }

    const plotData = [
      {
        type: "surface",
        z: surface,
        x: xGrid,
        y: yGrid,
        colorscale: "Earth",
        contours: {
          z: {
            show: true,
            usecolormap: true,
            highlightcolor: "#42f462",
            project: { z: true },
            width: 2,
          },
        },
        colorbar: {
          title: analysis.mapping.zAxis,
          titlefont: { size: 10 },
        },
        name: `Surface - ${data.length} points source`,
      },
    ]

    const layout = createDynamicLayout("Surface 3D - Lignes de Niveau", analysis)
    window.Plotly.newPlot(plotRef.current, plotData, layout, getPlotConfig())
  }

  // 8. HÉLICE ADN - Basée sur les séquences de données
  const renderDNAHelix = (analysis: DataAnalysis) => {
    const colorValues = getValuesFromAnalysis(analysis, "colorBy")
    const sizeValues = getValuesFromAnalysis(analysis, "sizeBy")

    const dnaX1: number[] = []
    const dnaY1: number[] = []
    const dnaZ1: number[] = []
    const dnaX2: number[] = []
    const dnaY2: number[] = []
    const dnaZ2: number[] = []
    const dnaColors: number[] = []
    const dnaSizes: number[] = []

    // Utiliser les vraies données pour moduler l'hélice
    const colorRange = analysis.dataRanges[analysis.mapping.colorBy]
    const sizeRange = analysis.dataRanges[analysis.mapping.sizeBy]

    data.forEach((row, i) => {
      const t = (i / data.length) * 8 * Math.PI
      const z = (i / data.length) * 4

      // Modulation basée sur les données
      const colorVal = colorValues[i]
      const sizeVal = sizeValues[i]

      const radiusModulation = colorRange
        ? 1 + (0.3 * (colorVal - colorRange.min)) / (colorRange.max - colorRange.min)
        : 1
      const heightModulation = sizeRange ? (0.1 * (sizeVal - sizeRange.min)) / (sizeRange.max - sizeRange.min) : 0

      // Premier brin
      dnaX1.push(Math.cos(t) * radiusModulation)
      dnaY1.push(Math.sin(t) * radiusModulation)
      dnaZ1.push(z + heightModulation)

      // Deuxième brin (décalé de π)
      dnaX2.push(Math.cos(t + Math.PI) * radiusModulation)
      dnaY2.push(Math.sin(t + Math.PI) * radiusModulation)
      dnaZ2.push(z + heightModulation)

      dnaColors.push(colorVal)
      dnaSizes.push(Math.max(4, Math.min(10, (sizeVal / (sizeRange?.max || 1)) * 6 + 4)))
    })

    const plotData = [
      {
        type: "scatter3d",
        mode: "markers+lines",
        x: dnaX1,
        y: dnaY1,
        z: dnaZ1,
        marker: {
          size: dnaSizes,
          color: dnaColors,
          colorscale: "RdYlBu",
          colorbar: {
            title: analysis.mapping.colorBy,
            titlefont: { size: 10 },
          },
        },
        line: { color: "rgba(255, 100, 100, 0.8)", width: 4 },
        name: `Brin ADN 1 - ${data.length} bases`,
      },
      {
        type: "scatter3d",
        mode: "markers+lines",
        x: dnaX2,
        y: dnaY2,
        z: dnaZ2,
        marker: { size: dnaSizes, color: dnaColors, colorscale: "RdYlBu" },
        line: { color: "rgba(100, 100, 255, 0.8)", width: 4 },
        name: `Brin ADN 2 - ${data.length} bases`,
        showlegend: false,
      },
    ]

    const layout = createDynamicLayout("Double Hélice ADN", analysis)
    layout.scene.camera = { eye: { x: 2, y: 0, z: 1 } }
    window.Plotly.newPlot(plotRef.current, plotData, layout, getPlotConfig())
  }

  // Fonction pour créer un layout dynamique basé sur l'analyse
  const createDynamicLayout = (title: string, analysis: DataAnalysis) => {
    const dataInfo = `${data.length} entrées • ${analysis.numericColumns.length} num. • ${analysis.categoricalColumns.length} cat.`

    return {
      scene: {
        xaxis: {
          title: {
            text: `${analysis.mapping.xAxis} ${analysis.dataTypes[analysis.mapping.xAxis] ? `(${analysis.dataTypes[analysis.mapping.xAxis]})` : ""}`,
            font: { size: 12, color: "#ea580c" },
          },
          showbackground: true,
          backgroundcolor: "rgba(240, 240, 240, 0.8)",
        },
        yaxis: {
          title: {
            text: `${analysis.mapping.yAxis} ${analysis.dataTypes[analysis.mapping.yAxis] ? `(${analysis.dataTypes[analysis.mapping.yAxis]})` : ""}`,
            font: { size: 12, color: "#ea580c" },
          },
          showbackground: true,
          backgroundcolor: "rgba(240, 240, 240, 0.8)",
        },
        zaxis: {
          title: {
            text: `${analysis.mapping.zAxis} ${analysis.dataTypes[analysis.mapping.zAxis] ? `(${analysis.dataTypes[analysis.mapping.zAxis]})` : ""}`,
            font: { size: 12, color: "#ea580c" },
          },
          showbackground: true,
          backgroundcolor: "rgba(240, 240, 240, 0.8)",
        },
        camera: { eye: { x: 1.25, y: 1.25, z: 1.25 } },
      },
      title: { text: title, font: { size: 18, color: "#ea580c" } },
      paper_bgcolor: "rgba(0,0,0,0)",
      margin: { l: 0, r: 0, t: 60, b: 0 },
      annotations: [
        {
          text: `<b>Modèle:</b> ${title}<br><b>Données:</b> ${dataInfo}<br><b>Mapping:</b><br>• X: ${analysis.mapping.xAxis}<br>• Y: ${analysis.mapping.yAxis}<br>• Z: ${analysis.mapping.zAxis}<br>• Couleur: ${analysis.mapping.colorBy}<br>• Taille: ${analysis.mapping.sizeBy}${analysis.mapping.categoryBy ? `<br>• Catégorie: ${analysis.mapping.categoryBy}` : ""}`,
          showarrow: false,
          xref: "paper",
          yref: "paper",
          x: -0.15,
          y: 0.95,
          xanchor: "left",
          yanchor: "top",
          bgcolor: "rgba(255, 255, 255, 0.8)",
          bordercolor: "rgba(234, 88, 12, 0.3)",
          borderwidth: 1,
          font: { size: 8, color: "#666" },
        },
      ],
    }
  }

  const getPlotConfig = () => ({
    responsive: true,
    displayModeBar: false,
    staticPlot: false,
    scrollZoom: true,
    doubleClick: "reset",
  })

  // renderV0Visualization est maintenant défini au début du composant

  const renderDemoVisualization = () => {
    const demoData = Array.from({ length: 50 }, (_, i) => ({
      x: Math.random() * 10,
      y: Math.random() * 10,
      z: Math.random() * 10,
      value: Math.random() * 100,
      category: `Cat${Math.floor(Math.random() * 5) + 1}`,
    }))

    setDataMapping({
      xAxis: "Dimension X",
      yAxis: "Dimension Y",
      zAxis: "Dimension Z",
      colorBy: "Valeur",
      sizeBy: "Valeur",
    })

    const plotData = [
      {
        type: "scatter3d",
        mode: "markers",
        x: demoData.map((d) => d.x),
        y: demoData.map((d) => d.y),
        z: demoData.map((d) => d.z),
        marker: {
          size: 8,
          color: demoData.map((d) => d.value),
          colorscale: "Rainbow",
          opacity: 0.8,
        },
        name: "Démonstration",
      },
    ]

    const layout = {
      scene: {
        xaxis: { title: "Dimension X", showbackground: true, backgroundcolor: "rgba(240, 240, 240, 0.8)" },
        yaxis: { title: "Dimension Y", showbackground: true, backgroundcolor: "rgba(240, 240, 240, 0.8)" },
        zaxis: { title: "Dimension Z", showbackground: true, backgroundcolor: "rgba(240, 240, 240, 0.8)" },
        camera: { eye: { x: 1.25, y: 1.25, z: 1.25 } },
      },
      title: { text: `Démonstration - ${getModelName(visualizationType)}`, font: { size: 18, color: "#ea580c" } },
      paper_bgcolor: "rgba(0,0,0,0)",
      margin: { l: 0, r: 0, t: 60, b: 0 },
    }

    window.Plotly.newPlot(plotRef.current, plotData, layout, getPlotConfig())
  }

  const getModelName = (modelId: string) => {
    const names: { [key: string]: string } = {
      scatter3d: "Nuage 3D Classique",
      scatter_density: "Densité 3D",
      scatter_bubble: "Bulles 3D",
      mandala_3d: "Mandala 3D",
      galaxy_3d: "Galaxie 3D",
      surface_contour: "Surface Contours",
      dna_helix: "Hélice ADN",
      timeline_3d: "Timeline 3D",
    }
    return names[modelId] || "Visualisation 3D"
  }

  return (
    <div className="h-full bg-gradient-to-br from-orange-50 to-white rounded-xl border-2 border-orange-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-orange-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Canvas IA • Visualisation Dynamique</h2>
              <p className="text-sm text-gray-600">
                {data.length > 0
                  ? `${data.length} échantillons • ${columns.length} variables • ${getModelName(currentModel)}`
                  : `Mode démonstration • ${getModelName(currentModel)}`}
              </p>
              {dataAnalysis && (
                <p className="text-xs text-gray-500">
                  {dataAnalysis.numericColumns.length} numériques • {dataAnalysis.categoricalColumns.length}{" "}
                  catégorielles • {dataAnalysis.temporalColumns.length} temporelles
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isV0Generated && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Code className="w-3 h-3 mr-1" />
                Généré par v0
              </span>
            )}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              <Zap className="w-3 h-3 mr-1" />
              Plotly v2.35
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Adaptatif Dynamique
            </span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative h-[calc(100%-120px)]">
        {!plotlyLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement de Plotly.js v2.35...</p>
              <p className="text-sm text-gray-500 mt-2">Analyse dynamique des données en cours...</p>
            </div>
          </div>
        ) : (
          <div ref={plotRef} className="w-full h-full" />
        )}
      </div>
    </div>
  )
}
