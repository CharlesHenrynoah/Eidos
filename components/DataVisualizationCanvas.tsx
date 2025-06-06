import { BarChart3 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
} from "recharts"

interface DataVisualizationCanvasProps {
  data: any[]
  columns: string[]
  visualizationType: string
}

const COLORS = ["#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa"]

export default function DataVisualizationCanvas({ data, columns, visualizationType }: DataVisualizationCanvasProps) {
  // Fonction pour préparer les données selon le type de visualisation
  const prepareData = () => {
    if (!data || data.length === 0) {
      // Données de démonstration si aucune donnée n'est fournie
      return [
        { name: "Alpha", value: 100 },
        { name: "Beta", value: 85 },
        { name: "Gamma", value: 70 },
        { name: "Delta", value: 95 },
        { name: "Epsilon", value: 60 },
        { name: "Zeta", value: 80 },
        { name: "Eta", value: 75 },
      ]
    }

    // Traitement des vraies données
    const processedData = data.slice(0, 20).map((row, index) => {
      const numericColumns = columns.filter((col) => {
        const value = row[col]
        return !isNaN(Number.parseFloat(value)) && isFinite(value)
      })

      const categoryColumns = columns.filter((col) => {
        const value = row[col]
        return isNaN(Number.parseFloat(value)) || !isFinite(value)
      })

      return {
        name: categoryColumns.length > 0 ? String(row[categoryColumns[0]]) : `Item ${index + 1}`,
        value: numericColumns.length > 0 ? Number.parseFloat(row[numericColumns[0]]) || 0 : Math.random() * 100,
        x: numericColumns.length > 0 ? Number.parseFloat(row[numericColumns[0]]) || 0 : Math.random() * 100,
        y: numericColumns.length > 1 ? Number.parseFloat(row[numericColumns[1]]) || 0 : Math.random() * 100,
        category: categoryColumns.length > 0 ? String(row[categoryColumns[0]]) : `Cat ${index + 1}`,
      }
    })

    return processedData
  }

  const chartData = prepareData()

  const renderVisualization = () => {
    switch (visualizationType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
              <XAxis dataKey="name" stroke="#ea580c" fontSize={12} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#ea580c" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #ea580c",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="value" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ea580c" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        )

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
              <XAxis dataKey="x" stroke="#ea580c" />
              <YAxis dataKey="y" stroke="#ea580c" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #ea580c",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Scatter dataKey="y" fill="#ea580c" />
            </ScatterChart>
          </ResponsiveContainer>
        )

      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #ea580c",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <RechartsPieChart dataKey="value" data={chartData} cx="50%" cy="50%" outerRadius={120}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </RechartsPieChart>
            </RechartsPieChart>
          </ResponsiveContainer>
        )

      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
              <XAxis dataKey="name" stroke="#ea580c" />
              <YAxis stroke="#ea580c" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #ea580c",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#ea580c"
                strokeWidth={3}
                dot={{ fill: "#ea580c", strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Symphonie de Données</h3>
              <p className="text-gray-600">Visualisation de démonstration générée</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="h-full w-full bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
              Canvas IA de Visualisation
            </h2>
            <p className="text-gray-600 text-sm">
              {data && data.length > 0
                ? `${data.length} entrées • ${columns.length} colonnes`
                : "Données de démonstration"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
            Démonstration Active
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg border-2 border-orange-100 p-4 h-[calc(100%-120px)]">
        <div className="h-full">{renderVisualization()}</div>
      </div>
    </div>
  )
}
