"use client"

import { useRef, useState, useMemo, useEffect } from "react"
import { Send, Sparkles, BarChart3, Brain, Layers, Zap, Search, X, Check } from "lucide-react"
import { useChat } from "ai/react"
import CSVUploader from "./CSVUploader"

interface ChatSidebarProps {
  data: any[]
  columns: string[]
  onVisualizationChange: (type: string, config?: any) => void
  onDataLoaded: (data: any[], columns: string[]) => void
}

interface ModelRequirements {
  minNumericColumns?: number
  minCategoricalColumns?: number
  minTemporalColumns?: number
  specificColumns?: {
    type: "numeric" | "categorical" | "temporal"
    count: number
    usage: string
  }[]
}

  interface VisualizationModel {
    id: string
    name: string
    description: string
    icon: any
    category: string
    tags: string[]
    complexity: "simple" | "medium" | "advanced"
    prompt: string
    requirements?: ModelRequirements
    disabled?: boolean
  }

const visualizationModels: VisualizationModel[] = [
  // Nuages de points (Scatter plots)
  {
    id: "scatter3d",
    name: "Nuage 3D",
    description: "Points dans l'espace 3D",
    icon: Sparkles,
    category: "Nuages",
    tags: ["points", "scatter", "3d", "basique"],
    complexity: "simple",
    prompt: "Représente mes données sous forme de nuage de points 3D classique avec des marqueurs sphériques",
    requirements: {
      minNumericColumns: 3,
      specificColumns: [
        { type: "numeric", count: 3, usage: "coordonnées x, y, z" }
      ]
    },
  },
  {
    id: "scatter_bubble",
    name: "Bulles 3D",
    description: "Nuage avec tailles variables",
    icon: Sparkles,
    category: "Nuages",
    tags: ["bulles", "tailles", "proportions"],
    complexity: "simple",
    prompt: "Transforme mes données en bulles 3D où la taille représente l'importance des valeurs",
    requirements: {
      minNumericColumns: 4,
      specificColumns: [
        { type: "numeric", count: 3, usage: "coordonnées x, y, z" },
        { type: "numeric", count: 1, usage: "taille des bulles" }
      ]
    },
  },
  {
    id: "scatter_animated",
    name: "Nuage Animé",
    description: "Points avec animation temporelle",
    icon: Sparkles,
    category: "Nuages",
    tags: ["animation", "temps", "évolution"],
    complexity: "medium",
    prompt: "Crée un nuage de points 3D avec des effets visuels animés et des transitions fluides",
    requirements: {
      minNumericColumns: 3,
      minTemporalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 3, usage: "coordonnées x, y, z" },
        { type: "temporal", count: 1, usage: "séquence temporelle" }
      ]
    },
  },
  {
    id: "scatter_clustered",
    name: "Nuage Groupé",
    description: "Points colorés par clusters",
    icon: Sparkles,
    category: "Nuages",
    tags: ["clusters", "groupes", "classification"],
    complexity: "medium",
    prompt: "Organise mes données en clusters colorés dans un espace 3D pour révéler les groupes naturels",
    requirements: {
      minNumericColumns: 3,
      minCategoricalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 3, usage: "coordonnées x, y, z" },
        { type: "categorical", count: 1, usage: "groupes ou catégories" }
      ]
    },
  },
  {
    id: "scatter_density",
    name: "Densité 3D",
    description: "Nuage avec zones de densité",
    icon: Sparkles,
    category: "Nuages",
    tags: ["densité", "concentration", "heatmap"],
    complexity: "medium",
    prompt: "Visualise la densité de mes données avec des zones de concentration en 3D",
    requirements: {
      minNumericColumns: 3,
      specificColumns: [
        { type: "numeric", count: 3, usage: "coordonnées x, y, z" }
      ]
    },
  },

  // Surfaces
  {
    id: "surface3d",
    name: "Surface 3D",
    description: "Surface continue interpolée",
    icon: Layers,
    category: "Surfaces",
    tags: ["surface", "continue", "interpolation"],
    complexity: "simple",
    prompt: "Transforme mes données en surface 3D continue et lisse par interpolation",
    requirements: {
      minNumericColumns: 3,
      specificColumns: [
        { type: "numeric", count: 3, usage: "valeurs pour la surface" }
      ]
    },
  },
  {
    id: "surface_contour",
    name: "Contours 3D",
    description: "Surface avec lignes de niveau",
    icon: Layers,
    category: "Surfaces",
    tags: ["contours", "niveaux", "topographie"],
    complexity: "medium",
    prompt: "Crée une surface 3D avec des contours colorés pour montrer les différents niveaux",
    requirements: {
      minNumericColumns: 3,
      specificColumns: [
        { type: "numeric", count: 3, usage: "valeurs pour la surface et les contours" }
      ]
    },
  },
  {
    id: "surface_mesh",
    name: "Maillage 3D",
    description: "Surface avec grille visible",
    icon: Layers,
    category: "Surfaces",
    tags: ["maillage", "grille", "wireframe"],
    complexity: "simple",
    prompt: "Génère une surface 3D avec un maillage visible pour montrer la structure",
    requirements: {
      minNumericColumns: 3,
      specificColumns: [
        { type: "numeric", count: 3, usage: "coordonnées x, y, z pour le maillage" }
      ]
    },
  },
  {
    id: "surface_gradient",
    name: "Gradient 3D",
    description: "Surface avec dégradés",
    icon: Layers,
    category: "Surfaces",
    tags: ["gradient", "dégradé", "couleurs"],
    complexity: "medium",
    prompt: "Génère une surface 3D avec des dégradés de couleurs selon les valeurs",
    requirements: {
      minNumericColumns: 4,
      specificColumns: [
        { type: "numeric", count: 3, usage: "coordonnées x, y, z" },
        { type: "numeric", count: 1, usage: "valeur pour le gradient de couleur" }
      ]
    },
  },
  {
    id: "surface_parametric",
    name: "Surface Paramétrique",
    description: "Surface avec paramètres",
    icon: Layers,
    category: "Surfaces",
    tags: ["paramètres", "mathématique", "fonction"],
    complexity: "advanced",
    prompt: "Crée une surface 3D paramétrique à partir de mes données",
    requirements: {
      minNumericColumns: 4,
      specificColumns: [
        { type: "numeric", count: 3, usage: "coordonnées x, y, z" },
        { type: "numeric", count: 1, usage: "paramètre de surface" }
      ]
    },
  },

  // Architectures (Barres et volumes)
  {
    id: "bars3d",
    name: "Barres 3D",
    description: "Architecture de données",
    icon: BarChart3,
    category: "Architecture",
    tags: ["barres", "architecture", "volumes"],
    complexity: "simple",
    prompt: "Construis une architecture 3D avec des barres représentant mes données comme des buildings",
  },
  {
    id: "bars_grouped",
    name: "Barres Groupées",
    description: "Groupes de barres 3D",
    icon: BarChart3,
    category: "Architectures",
    tags: ["groupes", "comparaison", "catégories"],
    complexity: "medium",
    prompt: "Organise mes données en barres 3D groupées par catégories pour faciliter la comparaison",
    requirements: {
      minNumericColumns: 1,
      minCategoricalColumns: 2,
      specificColumns: [
        { type: "numeric", count: 1, usage: "hauteur des barres" },
        { type: "categorical", count: 2, usage: "catégories principales et sous-groupes" }
      ]
    },
  },
  {
    id: "bars_simple",
    name: "Barres 3D",
    description: "Diagramme en barres 3D",
    icon: BarChart3,
    category: "Architectures",
    tags: ["barres", "histogramme", "comparaison"],
    complexity: "simple",
    prompt: "Crée un diagramme en barres 3D pour comparer mes données",
    requirements: {
      minNumericColumns: 1,
      minCategoricalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 1, usage: "hauteur des barres" },
        { type: "categorical", count: 1, usage: "catégories" }
      ]
    },
  },
  {
    id: "bars_stacked",
    name: "Barres Empilées",
    description: "Barres 3D empilées",
    icon: BarChart3,
    category: "Architectures",
    tags: ["barres", "empilé", "cumul"],
    complexity: "medium",
    prompt: "Empile mes données en barres 3D pour montrer leur composition",
    requirements: {
      minNumericColumns: 1,
      minCategoricalColumns: 2,
      specificColumns: [
        { type: "numeric", count: 1, usage: "valeurs à empiler" },
        { type: "categorical", count: 2, usage: "catégories principales et sous-catégories" }
      ]
    },
  },
  {
    id: "bars_cylindrical",
    name: "Cylindres 3D",
    description: "Barres cylindriques",
    icon: BarChart3,
    category: "Architecture",
    tags: ["cylindres", "tubes", "rond"],
    complexity: "medium",
    prompt: "Représente mes données sous forme de cylindres 3D élégants et volumétriques",
    requirements: {
      minNumericColumns: 2,
      minCategoricalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 1, usage: "hauteur des cylindres" },
        { type: "numeric", count: 1, usage: "rayon des cylindres" },
        { type: "categorical", count: 1, usage: "catégories" }
      ]
    },
  },
  {
    id: "bars_pyramid",
    name: "Pyramides 3D",
    description: "Données en forme de pyramides",
    icon: BarChart3,
    category: "Architecture",
    tags: ["pyramides", "triangulaire", "hiérarchie"],
    complexity: "medium",
    prompt: "Transforme mes données en pyramides 3D pour créer une hiérarchie visuelle",
  },

  // Géométriques
  {
    id: "sphere_pack",
    name: "Sphères Packées",
    description: "Sphères de tailles variables",
    icon: Sparkles,
    category: "Géométrique",
    tags: ["sphères", "packing", "bulles"],
    complexity: "medium",
    prompt: "Organise mes données en sphères packées de tailles variables dans l'espace 3D",
  },
  {
    id: "cube_matrix",
    name: "Matrice de Cubes",
    description: "Cubes arrangés en matrice",
    icon: BarChart3,
    category: "Géométrique",
    tags: ["cubes", "matrice", "grille"],
    complexity: "simple",
    prompt: "Arrange mes données en matrice de cubes 3D structurée et géométrique",
  },
  {
    id: "cone_field",
    name: "Champ de Cônes",
    description: "Cônes orientés dans l'espace",
    icon: Sparkles,
    category: "Géométrique",
    tags: ["cônes", "direction", "vecteurs"],
    complexity: "medium",
    prompt: "Crée un champ de cônes 3D orientés selon les directions de mes données",
  },
  {
    id: "torus_data",
    name: "Tore de Données",
    description: "Données sur surface toroïdale",
    icon: Layers,
    category: "Géométrique",
    tags: ["tore", "donut", "circulaire"],
    complexity: "advanced",
    prompt: "Projette mes données sur une surface toroïdale 3D pour une visualisation circulaire",
  },
  {
    id: "helix_spiral",
    name: "Spirale Hélicoïdale",
    description: "Données en spirale 3D",
    icon: Sparkles,
    category: "Géométrique",
    tags: ["spirale", "hélice", "rotation"],
    complexity: "medium",
    prompt: "Organise mes données en spirale hélicoïdale ascendante dans l'espace 3D",
  },

  // Réseaux et Graphes
  {
    id: "network_force",
    name: "Réseau Forces",
    description: "Réseau avec forces d'attraction",
    icon: Brain,
    category: "Réseaux",
    tags: ["forces", "attraction", "dynamique"],
    complexity: "advanced",
    prompt: "Génère un réseau 3D avec des forces d'attraction entre les noeuds",
    requirements: {
      minNumericColumns: 4,
      minCategoricalColumns: 2,
      specificColumns: [
        { type: "numeric", count: 3, usage: "coordonnées x, y, z des noeuds" },
        { type: "numeric", count: 1, usage: "force d'attraction" },
        { type: "categorical", count: 2, usage: "identifiants des noeuds source et cible" }
      ]
    },
  },
  {
    id: "network_hierarchical",
    name: "Réseau Hiérarchique",
    description: "Réseau avec hiérarchie",
    icon: Brain,
    category: "Réseaux",
    tags: ["hiérarchie", "organisation", "structure"],
    complexity: "advanced",
    prompt: "Organise mes données en réseau hiérarchique 3D pour montrer les relations",
    requirements: {
      minNumericColumns: 3,
      minCategoricalColumns: 2,
      specificColumns: [
        { type: "numeric", count: 2, usage: "coordonnées x, y des noeuds" },
        { type: "numeric", count: 1, usage: "niveau hiérarchique" },
        { type: "categorical", count: 2, usage: "identifiants des noeuds source et cible" }
      ]
    },
  },
  {
    id: "network_circular",
    name: "Réseau Circulaire",
    description: "Réseau en forme de cercle",
    icon: Brain,
    category: "Réseaux",
    tags: ["cercle", "circulaire", "organisation"],
    complexity: "medium",
    prompt: "Organise mes données en réseau circulaire 3D pour montrer les relations",
    requirements: {
      minNumericColumns: 2,
      minCategoricalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 1, usage: "angle des noeuds" },
        { type: "numeric", count: 1, usage: "rayon des noeuds" },
        { type: "categorical", count: 1, usage: "identifiants des noeuds" }
      ]
    },
  },
  {
    id: "network_3d",
    name: "Réseau 3D",
    description: "Graphe de nœuds et liens",
    icon: Sparkles,
    category: "Réseaux",
    tags: ["réseau", "graphe", "connexions"],
    complexity: "medium",
    prompt: "Transforme mes données en réseau 3D avec des nœuds connectés et des liens visibles",
    requirements: {
      minNumericColumns: 3,
      minCategoricalColumns: 2,
      specificColumns: [
        { type: "numeric", count: 3, usage: "coordonnées x, y, z des nœuds" },
        { type: "categorical", count: 2, usage: "identifiants source et cible des liens" }
      ]
    },
  },
  {
    id: "network_dynamic",
    name: "Réseau Dynamique",
    description: "Réseau avec animation",
    icon: Brain,
    category: "Réseaux",
    tags: ["animation", "mouvement", "évolution"],
    complexity: "advanced",
    prompt: "Anime mon réseau 3D pour montrer son évolution dans le temps",
    requirements: {
      minNumericColumns: 4,
      minCategoricalColumns: 2,
      specificColumns: [
        { type: "numeric", count: 3, usage: "coordonnées x, y, z des nœuds" },
        { type: "numeric", count: 1, usage: "temps ou séquence" },
        { type: "categorical", count: 2, usage: "identifiants source et cible des liens" }
      ]
    },
  },
  {
    id: "tree_3d",
    name: "Arbre 3D",
    description: "Structure arborescente",
    icon: Sparkles,
    category: "Réseaux",
    tags: ["arbre", "hiérarchie", "branches"],
    complexity: "medium",
    prompt: "Structure mes données en arbre hiérarchique 3D avec des branches et des nœuds",
    requirements: {
      minNumericColumns: 1,
      minCategoricalColumns: 2,
      specificColumns: [
        { type: "numeric", count: 1, usage: "niveau hiérarchique" },
        { type: "categorical", count: 2, usage: "identifiants parent et enfant" }
      ]
    },
  },
  {
    id: "force_directed",
    name: "Force Dirigée",
    description: "Réseau avec simulation physique",
    icon: Sparkles,
    category: "Réseaux",
    tags: ["force", "physique", "simulation"],
    complexity: "advanced",
    prompt: "Simule mes données avec un algorithme de force dirigée pour un réseau 3D naturel",
    requirements: {
      minNumericColumns: 2,
      minCategoricalColumns: 2,
      specificColumns: [
        { type: "numeric", count: 2, usage: "force et distance entre les noeuds" },
        { type: "categorical", count: 2, usage: "identifiants source et cible des liens" }
      ]
    },
  },
  {
    id: "chord_3d",
    name: "Diagramme Chord 3D",
    description: "Relations circulaires en 3D",
    icon: Sparkles,
    category: "Réseaux",
    tags: ["chord", "circulaire", "relations"],
    complexity: "advanced",
    prompt: "Crée un diagramme chord 3D circulaire pour montrer les relations entre mes données",
    requirements: {
      minNumericColumns: 1,
      minCategoricalColumns: 2,
      specificColumns: [
        { type: "numeric", count: 1, usage: "valeur des relations" },
        { type: "categorical", count: 2, usage: "catégories source et cible" }
      ]
    },
  },
  {
    id: "sankey_3d",
    name: "Sankey 3D",
    description: "Flux de données en 3D",
    icon: Sparkles,
    category: "Réseaux",
    tags: ["sankey", "flux", "transitions"],
    complexity: "advanced",
    prompt: "Visualise mes données comme des flux Sankey 3D avec des transitions fluides",
    requirements: {
      minNumericColumns: 1,
      minCategoricalColumns: 3,
      specificColumns: [
        { type: "numeric", count: 1, usage: "valeur des flux" },
        { type: "categorical", count: 2, usage: "catégories source et cible" },
        { type: "categorical", count: 1, usage: "niveau ou étape" }
      ]
    },
  },

  // Temporels
  {
    id: "timeline_3d",
    name: "Timeline 3D",
    description: "Évolution temporelle en 3D",
    icon: Sparkles,
    category: "Temporel",
    tags: ["temps", "évolution", "chronologie"],
    complexity: "medium",
    prompt: "Organise mes données sur une timeline 3D pour montrer l'évolution temporelle",
    requirements: {
      minNumericColumns: 1,
      minTemporalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 1, usage: "valeur à représenter" },
        { type: "temporal", count: 1, usage: "date ou horodatage" }
      ]
    },
  },
  {
    id: "wave_temporal",
    name: "Vagues Temporelles",
    description: "Données comme vagues dans le temps",
    icon: Layers,
    category: "Temporel",
    tags: ["vagues", "ondulations", "périodique"],
    complexity: "medium",
    prompt: "Transforme mes données en vagues temporelles ondulantes dans l'espace 3D",
    requirements: {
      minNumericColumns: 2,
      minTemporalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 1, usage: "amplitude des vagues" },
        { type: "numeric", count: 1, usage: "fréquence des ondulations" },
        { type: "temporal", count: 1, usage: "progression temporelle" }
      ]
    },
  },
  {
    id: "spiral_time",
    name: "Spirale Temporelle",
    description: "Temps en spirale ascendante",
    icon: Sparkles,
    category: "Temporel",
    tags: ["spirale", "temps", "cyclique"],
    complexity: "medium",
    prompt: "Enroule mes données temporelles en spirale ascendante pour montrer les cycles",
    requirements: {
      minNumericColumns: 2,
      minTemporalColumns: 1,
      minCategoricalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 1, usage: "hauteur de la spirale" },
        { type: "numeric", count: 1, usage: "rayon de la spirale" },
        { type: "temporal", count: 1, usage: "progression temporelle" },
        { type: "categorical", count: 1, usage: "groupement des cycles" }
      ]
    },
  },
  {
    id: "ribbon_time",
    name: "Ruban Temporel",
    description: "Évolution en ruban 3D",
    icon: Layers,
    category: "Temporel",
    tags: ["ruban", "flux", "continu"],
    complexity: "advanced",
    prompt: "Déploie mes données comme un ruban temporel fluide dans l'espace 3D",
    requirements: {
      minNumericColumns: 3,
      minTemporalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 1, usage: "hauteur du ruban" },
        { type: "numeric", count: 1, usage: "largeur du ruban" },
        { type: "numeric", count: 1, usage: "torsion du ruban" },
        { type: "temporal", count: 1, usage: "progression temporelle" }
      ]
    },
  },
  {
    id: "cascade_time",
    name: "Cascade Temporelle",
    description: "Données en cascade temporelle",
    icon: Layers,
    category: "Temporel",
    tags: ["cascade", "chute", "séquentiel"],
    complexity: "medium",
    prompt: "Arrange mes données en cascade temporelle séquentielle descendante",
    requirements: {
      minNumericColumns: 2,
      minTemporalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 1, usage: "hauteur de la cascade" },
        { type: "numeric", count: 1, usage: "vitesse de chute" },
        { type: "temporal", count: 1, usage: "séquence temporelle" }
      ]
    },
  },

  // Statistiques
  {
    id: "box_plot_3d",
    name: "Box Plot 3D",
    description: "Boîtes à moustaches en 3D",
    icon: BarChart3,
    category: "Statistique",
    tags: ["boxplot", "quartiles", "distribution"],
    complexity: "medium",
    prompt: "Représente mes données avec des boîtes à moustaches 3D pour l'analyse statistique",
    requirements: {
      minNumericColumns: 1,
      minCategoricalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 1, usage: "valeurs pour la distribution" },
        { type: "categorical", count: 1, usage: "groupes pour la comparaison" }
      ]
    },
  },
  {
    id: "violin_3d",
    name: "Violin Plot 3D",
    description: "Distributions en forme de violon",
    icon: Sparkles,
    category: "Statistique",
    tags: ["violin", "distribution", "densité"],
    complexity: "advanced",
    prompt: "Crée des violin plots 3D pour montrer la distribution et la densité de mes données",
    requirements: {
      minNumericColumns: 2,
      minCategoricalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 1, usage: "valeurs pour la distribution" },
        { type: "numeric", count: 1, usage: "densité de la distribution" },
        { type: "categorical", count: 1, usage: "groupes pour la comparaison" }
      ]
    },
  },
  {
    id: "histogram_3d",
    name: "Histogramme 3D",
    description: "Histogramme avec profondeur",
    icon: BarChart3,
    category: "Statistique",
    tags: ["histogramme", "fréquence", "distribution"],
    complexity: "simple",
    prompt: "Génère un histogramme 3D avec de la profondeur pour analyser la distribution",
    requirements: {
      minNumericColumns: 2,
      minCategoricalColumns: 1,
      specificColumns: [
        { type: "numeric", count: 1, usage: "valeurs pour les barres" },
        { type: "numeric", count: 1, usage: "hauteur des barres" },
        { type: "categorical", count: 1, usage: "catégories pour le regroupement" }
      ]
    },
  },
  {
    id: "regression_3d",
    name: "Régression 3D",
    description: "Plan de régression en 3D",
    icon: Layers,
    category: "Statistique",
    tags: ["régression", "tendance", "prédiction"],
    complexity: "advanced",
    prompt: "Calcule et affiche un plan de régression 3D pour prédire les tendances",
    requirements: {
      minNumericColumns: 3,
      specificColumns: [
        { type: "numeric", count: 1, usage: "variable dépendante (y)" },
        { type: "numeric", count: 2, usage: "variables indépendantes (x1, x2)" }
      ]
    },
  },
  {
    id: "confidence_3d",
    name: "Intervalles 3D",
    description: "Intervalles de confiance en 3D",
    icon: Sparkles,
    category: "Statistique",
    tags: ["confiance", "intervalles", "incertitude"],
    complexity: "advanced",
    prompt: "Visualise les intervalles de confiance de mes données dans un espace 3D",
    requirements: {
      minNumericColumns: 4,
      specificColumns: [
        { type: "numeric", count: 1, usage: "valeurs moyennes" },
        { type: "numeric", count: 1, usage: "bornes inférieures" },
        { type: "numeric", count: 1, usage: "bornes supérieures" },
        { type: "numeric", count: 1, usage: "niveau de confiance" }
      ]
    },
  },

  // Artistiques
  {
    id: "mandala_3d",
    name: "Mandala 3D",
    description: "Motifs circulaires hypnotiques",
    icon: Sparkles,
    category: "Artistique",
    tags: ["mandala", "circulaire", "hypnotique"],
    complexity: "medium",
    prompt: "Transforme mes données en mandala 3D hypnotique avec des motifs circulaires sacrés",
    requirements: {
      minNumericColumns: 3,
      specificColumns: [
        { type: "numeric", count: 1, usage: "rayon des cercles" },
        { type: "numeric", count: 1, usage: "rotation des motifs" },
        { type: "numeric", count: 1, usage: "intensité des motifs" }
      ]
    },
  },
  {
    id: "fractal_3d",
    name: "Fractale 3D",
    description: "Structures fractales complexes",
    icon: Sparkles,
    category: "Artistique",
    tags: ["fractale", "complexe", "récursif"],
    complexity: "advanced",
    prompt: "Génère une structure fractale 3D complexe et récursive basée sur mes données",
    requirements: {
      minNumericColumns: 4,
      specificColumns: [
        { type: "numeric", count: 1, usage: "niveau de récursion" },
        { type: "numeric", count: 1, usage: "facteur d'échelle" },
        { type: "numeric", count: 1, usage: "angle de rotation" },
        { type: "numeric", count: 1, usage: "complexité des motifs" }
      ]
    },
  },
  {
    id: "crystal_3d",
    name: "Cristal 3D",
    description: "Structure cristalline",
    icon: Sparkles,
    category: "Artistique",
    tags: ["cristal", "géométrique", "symétrie"],
    complexity: "medium",
    prompt: "Crée une structure cristalline 3D symétrique et géométrique avec mes données",
    requirements: {
      minNumericColumns: 3,
      specificColumns: [
        { type: "numeric", count: 1, usage: "taille des faces" },
        { type: "numeric", count: 1, usage: "angle des faces" },
        { type: "numeric", count: 1, usage: "transparence" }
      ]
    },
  },
  {
    id: "galaxy_3d",
    name: "Galaxie 3D",
    description: "Données en forme de galaxie",
    icon: Sparkles,
    category: "Artistique",
    tags: ["galaxie", "cosmique", "spirale"],
    complexity: "medium",
    prompt: "Organise mes données en galaxie spirale cosmique dans l'espace 3D infini",
    requirements: {
      minNumericColumns: 4,
      specificColumns: [
        { type: "numeric", count: 1, usage: "distance au centre" },
        { type: "numeric", count: 1, usage: "angle de rotation" },
        { type: "numeric", count: 1, usage: "luminosité" },
        { type: "numeric", count: 1, usage: "taille des étoiles" }
      ]
    },
  },
  {
    id: "dna_helix",
    name: "Hélice ADN",
    description: "Double hélice de données",
    icon: Sparkles,
    category: "Artistique",
    tags: ["adn", "hélice", "biologique"],
    complexity: "advanced",
    prompt: "Structure mes données en double hélice ADN pour une visualisation biologique",
  },

  // Géographiques
  {
    id: "globe_3d",
    name: "Globe 3D",
    description: "Données sur sphère terrestre",
    icon: Sparkles,
    category: "Géographique",
    tags: ["globe", "terre", "géographique"],
    complexity: "medium",
    prompt: "Projette mes données sur un globe terrestre 3D interactif et géographique",
  },
  {
    id: "terrain_3d",
    name: "Terrain 3D",
    description: "Relief topographique",
    icon: Layers,
    category: "Géographique",
    tags: ["terrain", "relief", "topographie"],
    complexity: "medium",
    prompt: "Transforme mes données en relief topographique 3D avec des élévations naturelles",
  },
  {
    id: "map_extrusion",
    name: "Carte Extrudée",
    description: "Carte avec hauteurs",
    icon: BarChart3,
    category: "Géographique",
    tags: ["carte", "extrusion", "hauteur"],
    complexity: "medium",
    prompt: "Extrude mes données sur une carte 3D avec des hauteurs proportionnelles",
  },
  {
    id: "flight_paths",
    name: "Trajectoires 3D",
    description: "Chemins et trajectoires",
    icon: Sparkles,
    category: "Géographique",
    tags: ["trajectoires", "chemins", "routes"],
    complexity: "medium",
    prompt: "Trace des trajectoires de vol 3D connectant mes points de données",
  },
  {
    id: "heatmap_globe",
    name: "Heatmap Globe",
    description: "Carte de chaleur sur globe",
    icon: Sparkles,
    category: "Géographique",
    tags: ["heatmap", "chaleur", "intensité"],
    complexity: "advanced",
    prompt: "Crée une heatmap thermique sur un globe 3D pour montrer l'intensité des données",
  },

  // Scientifiques
  {
    id: "molecule_3d",
    name: "Molécule 3D",
    description: "Structure moléculaire",
    icon: Sparkles,
    category: "Scientifique",
    tags: ["molécule", "atomes", "chimie"],
    complexity: "advanced",
    prompt: "Modélise mes données comme une structure moléculaire 3D avec des liaisons atomiques",
  },
  {
    id: "vector_field",
    name: "Champ Vectoriel",
    description: "Champ de vecteurs 3D",
    icon: Sparkles,
    category: "Scientifique",
    tags: ["vecteurs", "champ", "direction"],
    complexity: "advanced",
    prompt: "Génère un champ vectoriel 3D montrant les directions et forces de mes données",
  },
  {
    id: "particle_system",
    name: "Système Particules",
    description: "Simulation de particules",
    icon: Sparkles,
    category: "Scientifique",
    tags: ["particules", "simulation", "physique"],
    complexity: "advanced",
    prompt: "Simule mes données comme un système de particules 3D avec physique réaliste",
  },
  {
    id: "fluid_flow",
    name: "Flux Fluide",
    description: "Écoulement de fluide",
    icon: Layers,
    category: "Scientifique",
    tags: ["fluide", "écoulement", "dynamique"],
    complexity: "advanced",
    prompt: "Visualise mes données comme un écoulement de fluide 3D avec dynamique des fluides",
  },
  {
    id: "electromagnetic",
    name: "Champ EM",
    description: "Champ électromagnétique",
    icon: Sparkles,
    category: "Scientifique",
    tags: ["électromagnétique", "ondes", "physique"],
    complexity: "advanced",
    prompt: "Représente mes données comme un champ électromagnétique 3D avec ondes et forces",
  },
]

// Client-only component to render time safely
const ClientTime = ({ timestamp }: { timestamp?: number | Date }) => {
  const [time, setTime] = useState<string>("");
  
  useEffect(() => {
    // Set the time only on the client side
    if (timestamp instanceof Date) {
      setTime(timestamp.toLocaleTimeString("fr-FR"));
    } else {
      setTime(new Date(timestamp || Date.now()).toLocaleTimeString("fr-FR"));
    }
  }, [timestamp]);
  
  return time;
};

// Fonction pour vérifier si un modèle peut être utilisé avec les données actuelles
const checkModelCompatibility = (model: VisualizationModel, data: any[], columns: string[]): boolean => {
  // Analyser les types de colonnes
  const columnTypes = columns.reduce((acc, col) => {
    const values = data.map(row => row[col])
    const isNumeric = values.every(v => typeof v === 'number' || !isNaN(parseFloat(v)))
    const isTemporal = values.every(v => !isNaN(Date.parse(v)))
    const isCategorical = !isNumeric && !isTemporal

    if (isNumeric) acc.numeric.push(col)
    if (isTemporal) acc.temporal.push(col)
    if (isCategorical) acc.categorical.push(col)
    return acc
  }, { numeric: [] as string[], temporal: [] as string[], categorical: [] as string[] })

  const requirements = model.requirements || {}
  
  // Vérifier les minimums requis
  if (requirements.minNumericColumns && columnTypes.numeric.length < requirements.minNumericColumns) return false
  if (requirements.minTemporalColumns && columnTypes.temporal.length < requirements.minTemporalColumns) return false
  if (requirements.minCategoricalColumns && columnTypes.categorical.length < requirements.minCategoricalColumns) return false

  // Vérifier les colonnes spécifiques
  if (requirements.specificColumns) {
    for (const req of requirements.specificColumns) {
      const available = columnTypes[req.type].length
      if (available < req.count) return false
    }
  }

  return true
}

export default function ChatSidebar({ data, columns, onVisualizationChange, onDataLoaded }: ChatSidebarProps) {
  // Mettre à jour les modèles avec leur statut de compatibilité
  const models = useMemo(() => {
    return visualizationModels.map(model => ({
      ...model,
      disabled: !checkModelCompatibility(model, data || [], columns || [])
    }))
  }, [data, columns])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isGeneratingViz, setIsGeneratingViz] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Tous")
  const [showAllModels, setShowAllModels] = useState(false)
  const [activeModel, setActiveModel] = useState<string>("scatter3d")

  // Chat pour l'analyse des données avec Gemini
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: "/api/chat",
    body: { data, columns },
    initialMessages: [
      {
        id: "1",
        role: "assistant",
        content:
          "Bonjour ! Je suis votre assistant d'analyse de données. Importez un fichier CSV et cliquez sur un modèle de visualisation pour transformer vos données !",
      },
    ],
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Génération de visualisation avec prompt automatique
  const generateVisualization = async (modelId: string) => {
    const model = models.find((m: VisualizationModel) => m.id === modelId)
    if (!model || model.disabled) return

    setActiveModel(modelId)
    setIsGeneratingViz(true)

    // Ajouter un message automatique dans le chat
    const promptMessage = `🎨 **Modèle sélectionné : ${model.name}**

${model.prompt}`

    await append({
      role: "user",
      content: promptMessage,
    })

    try {
      // Envoyer toutes les données pour une visualisation complète
      const response = await fetch("/api/generate-visualization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: data, // Envoyer toutes les données
          columns,
          userRequest: modelId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const result = await response.json()

      // Appliquer immédiatement la visualisation
      onVisualizationChange(modelId, result)

      // Ajouter une réponse de confirmation
      await append({
        role: "assistant",
        content: `✨ Visualisation générée ! **${model.name}** transforme vos ${data.length} entrées en une représentation ${model.category.toLowerCase()} interactive. Explorez les patterns dans l'espace 3D !`,
      })
    } catch (error) {
      console.error("Erreur génération visualisation:", error)
      
      // En cas d'erreur, on applique quand même le changement de modèle
      onVisualizationChange(modelId, {
        config: {
          type: modelId,
          defaultMapping: true
        }
      })

      await append({
        role: "assistant",
        content: `⚠️ Une erreur est survenue lors de la génération de la configuration optimale. J'ai appliqué le modèle **${model.name}** avec les paramètres par défaut.`,
      })
    } finally {
      setIsGeneratingViz(false)
    }
  }

  // Filtrage des modèles
  const categories = ["Tous", ...Array.from(new Set(models.map((model) => model.category)))]

  const filteredModels = models.filter((model) => {
    if (model.disabled) return false
    const matchesSearch =
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === "Tous" || model.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const displayedModels = showAllModels ? filteredModels : filteredModels.slice(0, 6)

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-orange-50">
      {/* Header */}
      <div className="p-6 border-b border-orange-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800">Eidos</h1>
            <p className="text-sm text-orange-600">
              {models.filter(m => !m.disabled).length}+ modèles • Modèle actif:{" "}
              {models.find((m) => m.id === activeModel)?.name || "Aucun"}
            </p>
          </div>
        </div>

        {/* Upload Section */}
        {data.length === 0 && (
          <div className="mb-4">
            <CSVUploader onDataLoaded={onDataLoaded} />
          </div>
        )}

        {/* Active Model Display */}
        {activeModel && (
          <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Modèle actif: {models.find((m) => m.id === activeModel)?.name}
              </span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              {models.find((m) => m.id === activeModel)?.description}
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] ${
                message.role === "user"
                  ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white"
                  : "bg-white border border-orange-200"
              } rounded-2xl p-4 shadow-sm`}
            >
              <div className={`text-sm ${message.role === "user" ? "text-white" : "text-gray-800"}`}>
                {message.content.split("\n").map((line, index) => (
                  <div key={index}>
                    {line.startsWith("🎨 **") ? (
                      <div className="font-bold text-orange-600 mb-2">{line.replace(/\*\*/g, "")}</div>
                    ) : line.startsWith("**") && line.endsWith("**") ? (
                      <div className="font-bold">{line.replace(/\*\*/g, "")}</div>
                    ) : (
                      <div>{line}</div>
                    )}
                  </div>
                ))}
              </div>
              <p className={`text-xs mt-2 ${message.role === "user" ? "text-orange-100" : "text-gray-500"}`}>
                <ClientTime timestamp={message.createdAt} />
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-orange-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Visualization Models Section */}
      <div className="p-4 border-t border-orange-200 max-h-96 overflow-y-auto">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <p className="text-sm font-medium text-gray-800">
                Modèles de Visualisation ({models.filter(m => !m.disabled).length})
              </p>
            </div>
            <button
              onClick={() => setShowAllModels(!showAllModels)}
              className="text-xs text-orange-600 hover:text-orange-700"
            >
              {showAllModels ? "Réduire" : "Voir tout"}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un modèle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="mb-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Models Grid */}
          <div className="space-y-2">
            {displayedModels.map((model) => {
              const Icon = model.icon
              const isActive = activeModel === model.id
              return (
                <button
                  key={model.id}
                  onClick={() => generateVisualization(model.id)}
                  disabled={isGeneratingViz || model.disabled}
                  title={model.disabled ? "Modèle incompatible avec les données" : undefined}
                  className={`flex items-center space-x-3 w-full px-3 py-3 text-left border rounded-lg transition-all disabled:opacity-50 group ${
                    isActive
                      ? "bg-gradient-to-r from-green-100 to-emerald-100 border-green-300 ring-2 ring-green-200"
                      : "bg-orange-50 hover:bg-orange-100 border-orange-200"
                  }`}
                >
                  <div
                    className={`w-8 h-8 bg-gradient-to-br rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive ? "from-green-500 to-emerald-600" : "from-orange-500 to-orange-600"
                    } ${
                      model.complexity === "advanced"
                        ? "ring-2 ring-purple-300"
                        : model.complexity === "medium"
                          ? "ring-2 ring-blue-300"
                          : ""
                    }`}
                  >
                    {isActive ? <Check className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p
                        className={`text-sm font-medium ${
                          isActive ? "text-green-800" : "text-gray-800 group-hover:text-orange-700"
                        }`}
                      >
                        {model.name}
                        {isActive && <span className="ml-2 text-xs">✓ ACTIF</span>}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          model.complexity === "advanced"
                            ? "bg-purple-100 text-purple-700"
                            : model.complexity === "medium"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {model.complexity === "advanced"
                          ? "Avancé"
                          : model.complexity === "medium"
                            ? "Moyen"
                            : "Simple"}
                      </span>
                    </div>
                    <p className={`text-xs ${isActive ? "text-green-600" : "text-gray-600"}`}>{model.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {model.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className={`text-xs px-1 py-0.5 rounded ${
                            isActive ? "bg-green-200 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {isGeneratingViz && activeModel === model.id && (
                    <div className="w-4 h-4 border border-orange-600 border-t-transparent rounded-full animate-spin" />
                  )}
                </button>
              )
            })}
          </div>

          {filteredModels.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun modèle trouvé</p>
              <p className="text-xs">Essayez d'autres mots-clés</p>
            </div>
          )}

          {!showAllModels && filteredModels.length > 6 && (
            <div className="text-center mt-3">
              <button onClick={() => setShowAllModels(true)} className="text-sm text-orange-600 hover:text-orange-700">
                +{filteredModels.length - 6} modèles supplémentaires
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-orange-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Posez une question sur vos données..."
            className="flex-1 px-4 py-2 border border-orange-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-full flex items-center justify-center hover:from-orange-700 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-2">
          💡 Cliquez sur un modèle pour transformer vos données •{" "}
          {data.length > 0 ? `${data.length} entrées chargées` : "Importez un CSV"}
        </p>
      </div>
    </div>
  )
}
