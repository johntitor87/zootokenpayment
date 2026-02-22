export type ModelProviderName = 
  | 'OPENAI' 
  | 'LLAMACLOUD' 
  | 'ANTHROPIC' 
  | 'REDPILL' 
  | 'OPENROUTER' 
  | 'GROK' 
  | 'HEURIST' 
  | 'GROQ';

export interface TwitterAuthSettings {
  useTraditionalLogin?: boolean;
  useApiAuthentication?: boolean;
  callbackUrl?: string;
}

export interface CharacterSettings {
  modelProvider: ModelProviderName;
  clients?: string[] | Record<string, any>;
  twitterAuth?: TwitterAuthSettings;
  secrets?: {
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    CLAUDE_API_KEY?: string;
    LLAMACLOUD_API_KEY?: string;
    TOGETHER_API_KEY?: string;
    XAI_API_KEY?: string;
    REDPILL_API_KEY?: string;
    OPENROUTER?: string;
    GROK_API_KEY?: string;
    HEURIST_API_KEY?: string;
    GROQ_API_KEY?: string;
    TWITTER_USERNAME?: string;
    TWITTER_PASSWORD?: string;
    [key: string]: string | undefined;
  };
}

export interface Character {
  name: string;
  description: string;
  personality: {
    traits: string[];
    quirks: string[];
    speech_patterns: string[];
  };
  knowledge: {
    expertise: string[];
    sources: string[];
    limitations: string[];
  };
  behaviors: {
    pattern_recognition: {
      magnitude_thresholds: {
        major: number;
        significant: number;
        moderate: number;
      };
      magnetic_field_thresholds?: {
        normal_min: number;
        normal_max: number;
        weak: number;
        superweak: number;
      };
    };
  };
  message_templates: {
    prophetic_analysis: string[];
    modern_science_validation: string[];
    earthquake_alert: string;
    magnetic_field_alert?: string;
  };
  settings?: CharacterSettings;
} 
