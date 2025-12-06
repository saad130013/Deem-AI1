

export interface Scene {
  id: string;
  mediaUrls: string[]; // Base64 or Blob URL array
  mediaType: 'image' | 'video';
  narrative: string;
  dialogue: string;
  audioUrl?: string; // Optional per-scene recording
}

export interface Story {
  studentName: string;
  grade: string;
  schoolName: string;
  title: string;
  languageMode: 'ar' | 'bilingual'; // Arabic-only or Arabic+English
  scenes: Scene[];
}

export enum AppStep {
  INPUT = 'INPUT',
  EDITOR = 'EDITOR',
  PREVIEW = 'PREVIEW',
}