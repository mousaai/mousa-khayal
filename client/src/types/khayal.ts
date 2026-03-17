export interface GeneratedScene {
  type: string;
  label: string;
  prompt: string;
  imageUrl: string;
  arabicCaption?: string;
  order?: number;
}

export interface FilmRequirements {
  sceneCount: number;
  sceneDurationSec: number;
  estimatedGenerationMinutes: number;
  batchSize: number;
  description: string;
}

export interface GenerationResult {
  projectId?: number | null;
  description: string;
  scenarioType: string;
  scenes: GeneratedScene[];
  title?: string;
  culturalContext?: string;
  atmosphere?: string;
  cinematicStyle?: string;
  mainElements?: string[];
  detectedLanguage?: string;
  unifiedConcept?: string;
  filmRequirements?: FilmRequirements;
  // Film batch fields
  batchIndex?: number;
  totalScenes?: number;
  isComplete?: boolean;
  progress?: number;
}

export interface DocumentAnalysis {
  extractedText: string;
  projectTitle: string;
  projectType: string;
  dimensions: Array<{ element: string; value: string; unit: string }>;
  architecturalElements: string[];
  geometricMass: {
    shape: string;
    estimatedWidth: string;
    estimatedLength: string;
    estimatedHeight: string;
    floorCount: number;
    setbacks: { front: string; back: string; left: string; right: string };
  };
  mainDescription: string;
  culturalContext: string;
  language: string;
  confidence: number;
}
