"use client"

import type React from "react"
import { useCallback, useState } from "react"
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react"
import Papa from "papaparse"

interface CSVUploaderProps {
  onDataLoaded: (data: any[], columns: string[]) => void
}

export default function CSVUploader({ onDataLoaded }: CSVUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const processCSV = useCallback(
    (file: File) => {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "UTF-8",
        complete: (results) => {
          try {
            const data = results.data as any[]
            if (!data || data.length === 0) {
              throw new Error("Le fichier CSV est vide")
            }

            const columns = Object.keys(data[0]).filter((col) => col && col.trim() !== "")
            if (columns.length === 0) {
              throw new Error("Aucune colonne valide trouvée")
            }

            const validData = data.filter((row) => {
              return columns.some((col) => row[col] && row[col].toString().trim() !== "")
            })

            setSuccess(true)
            onDataLoaded(validData, columns)
            setTimeout(() => setSuccess(false), 3000)
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Erreur lors du traitement"
            setError(errorMessage)
          } finally {
            setIsLoading(false)
          }
        },
        error: (error) => {
          setError(`Erreur de lecture: ${error.message}`)
          setIsLoading(false)
        },
      })
    },
    [onDataLoaded],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const csvFile = files.find((file) => file.type === "text/csv" || file.name.endsWith(".csv"))

      if (csvFile) {
        processCSV(csvFile)
      } else {
        setError("Veuillez sélectionner un fichier CSV")
      }
    },
    [processCSV],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        processCSV(file)
      }
    },
    [processCSV],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Upload className="w-4 h-4 text-orange-600" />
        <h3 className="font-medium text-gray-800 text-sm">Importer vos données</h3>
      </div>

      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 text-sm
          ${
            isDragOver
              ? "border-orange-400 bg-orange-50"
              : "border-orange-300 bg-gradient-to-br from-orange-50 to-white"
          }
          ${isLoading ? "opacity-50 pointer-events-none" : "hover:border-orange-400 hover:bg-orange-50"}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
      >
        <div className="space-y-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : success ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : (
              <Upload className="w-5 h-5 text-white" />
            )}
          </div>

          <div>
            <p className="font-medium text-gray-800 text-sm">
              {isLoading ? "Traitement..." : success ? "Importé !" : "Glissez-déposez votre fichier CSV"}
            </p>
            <p className="text-xs text-gray-500">ou cliquez pour sélectionner</p>
            <p className="text-xs text-gray-400">Formats: .csv (max 10MB)</p>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isLoading}
          />

          <button
            onClick={() => document.querySelector('input[type="file"]')?.click()}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white text-xs font-medium rounded-lg hover:from-orange-700 hover:to-orange-600 transition-all duration-200 disabled:opacity-50"
          >
            <FileText className="w-3 h-3 mr-1" />
            Sélectionner un fichier
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-xs">{error}</p>
        </div>
      )}
    </div>
  )
}
