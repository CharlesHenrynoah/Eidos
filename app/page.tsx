"use client"

import { useState } from "react"
import ChatSidebar from "../components/ChatSidebar"
import Canvas3DVisualization from "../components/Canvas3DVisualization"

export default function Page() {
  const [data, setData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [visualizationType, setVisualizationType] = useState<string>("scatter3d")
  const [generatedConfig, setGeneratedConfig] = useState<any>()

  const handleDataLoaded = (loadedData: any[], loadedColumns: string[]) => {
    setData(loadedData)
    setColumns(loadedColumns)
    // Réinitialiser la visualisation générée quand de nouvelles données sont chargées
    setGeneratedConfig(undefined)
  }

  const handleVisualizationChange = (type: string, config?: any) => {
    setVisualizationType(type)
    if (config) {
      setGeneratedConfig(config)
    } else {
      setGeneratedConfig(undefined)
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 to-white flex">
      {/* Chat Sidebar - Gemini pour l'analyse */}
      <div className="w-96 border-r-2 border-orange-200 bg-white">
        <ChatSidebar
          data={data}
          columns={columns}
          onVisualizationChange={handleVisualizationChange}
          onDataLoaded={handleDataLoaded}
        />
      </div>

      {/* Main Canvas Area - Plotly.js pour la visualisation 3D */}
      <div className="flex-1 p-6">
        <Canvas3DVisualization
          data={data}
          columns={columns}
          visualizationType={visualizationType}
          generatedConfig={generatedConfig}
        />
      </div>
    </div>
  )
}
