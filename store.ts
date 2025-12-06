import { create } from 'zustand';
import { Scene, Story } from './types';

interface StoryState {
  story: Story;
  setStoryMeta: (meta: Partial<Story>) => void;
  setScenes: (scenes: Scene[]) => void;
  
  // Scene Actions
  addScene: (scene?: Scene) => void;
  removeScene: (sceneId: string) => void;
  updateScene: (sceneId: string, field: keyof Omit<Scene, 'id'>, value: any) => void;
  reorderScenes: (startIndex: number, endIndex: number) => void;
  setAudio: (sceneId: string, audioUrl: string) => void;

  // New actions for multi-media scenes
  addMediaToScene: (sceneId: string, mediaUrl: string, mediaType: 'image' | 'video') => void;
  removeMediaFromScene: (sceneId: string, mediaIndex: number) => void;
}

export const useStoryStore = create<StoryState>((set) => ({
  story: {
    studentName: '',
    grade: '',
    schoolName: '',
    title: '',
    languageMode: 'bilingual',
    scenes: [],
  },

  setStoryMeta: (meta) => set((state) => ({
    story: { ...state.story, ...meta }
  })),

  setScenes: (scenes) => set((state) => ({
    story: { ...state.story, scenes }
  })),

  addScene: (scene) => set((state) => ({
    story: {
      ...state.story,
      scenes: [...state.story.scenes, scene || {
        id: `scene-${Date.now()}`,
        mediaUrls: [],
        mediaType: 'image',
        narrative: '',
        dialogue: '',
      }]
    }
  })),

  removeScene: (sceneId) => set((state) => ({
    story: {
      ...state.story,
      scenes: state.story.scenes.filter((s) => s.id !== sceneId)
    }
  })),

  updateScene: (sceneId, field, value) => set((state) => ({
    story: {
      ...state.story,
      scenes: state.story.scenes.map((s) => 
        s.id === sceneId ? { ...s, [field]: value } : s
      )
    }
  })),

  reorderScenes: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.story.scenes);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { story: { ...state.story, scenes: result } };
  }),

  setAudio: (sceneId, audioUrl) => set((state) => ({
    story: {
      ...state.story,
      scenes: state.story.scenes.map((s) => 
        s.id === sceneId ? { ...s, audioUrl } : s
      )
    }
  })),

  addMediaToScene: (sceneId, mediaUrl, mediaType) => set((state) => ({
    story: {
      ...state.story,
      scenes: state.story.scenes.map((s) => {
        if (s.id === sceneId && s.mediaUrls.length < 2) {
          return {
            ...s,
            mediaUrls: [...s.mediaUrls, mediaUrl],
            mediaType: mediaType,
          };
        }
        return s;
      }),
    },
  })),

  removeMediaFromScene: (sceneId, mediaIndex) => set((state) => ({
    story: {
        ...state.story,
        scenes: state.story.scenes.map((s) => {
            if (s.id === sceneId) {
                const newMediaUrls = [...s.mediaUrls];
                newMediaUrls.splice(mediaIndex, 1);
                return {
                    ...s,
                    mediaUrls: newMediaUrls,
                };
            }
            return s;
        }),
    },
  })),
}));
