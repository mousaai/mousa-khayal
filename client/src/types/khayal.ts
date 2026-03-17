export interface GeneratedScene {
  type: string;
  label: string;
  prompt: string;
  imageUrl: string;
  arabicCaption?: string;
  order?: number;
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
}
