import React, { useRef, useState } from 'react';
import { useStoryStore } from '../store';
import { Trash2, Plus, ArrowUp, ArrowDown, Mic, StopCircle, ImagePlus, X } from 'lucide-react';
import { Scene } from '../types';

interface StoryEditorProps {
  onPreview: () => void;
}

export const StoryEditor: React.FC<StoryEditorProps> = ({ onPreview }) => {
  const { story, addScene, removeScene, updateScene, reorderScenes, setAudio, addMediaToScene, removeMediaFromScene } = useStoryStore();
  
  const addMediaInputRef = useRef<HTMLInputElement>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  
  const [recordingSceneId, setRecordingSceneId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const processMediaFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (file.type.startsWith('video')) {
          resolve(result);
          return;
        }
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 800;
          canvas.height = 800;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 800, 800);
            resolve(canvas.toDataURL(file.type));
          } else {
            resolve(result);
          }
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddMediaClick = (sceneId: string) => {
    setActiveSceneId(sceneId);
    addMediaInputRef.current?.click();
  };

  const handleAddMediaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeSceneId) {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      const result = await processMediaFile(file);
      addMediaToScene(activeSceneId, result, type);
    }
    if (addMediaInputRef.current) addMediaInputRef.current.value = '';
  };

  const startRecording = async (sceneId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        setAudio(sceneId, audioUrl);
        setRecordingSceneId(null);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingSceneId(sceneId);
    } catch (err) {
      console.error("Audio recording failed", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const textDir = (story.languageMode === 'ar' || story.languageMode === 'bilingual') ? 'rtl' : 'ltr';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-32">
      <input type="file" ref={addMediaInputRef} className="hidden" onChange={handleAddMediaFile} accept="image/*,video/*" />

      {story.scenes.map((scene, index) => {
        return (
          <div key={scene.id} className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden relative transition-all hover:shadow-xl">
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="bg-slate-800 text-white w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm">
                  {index + 1}
                </span>
                <span className="font-bold text-slate-700">Scene {index + 1}</span>
                <div className="flex gap-1 ml-4">
                  <button disabled={index === 0} onClick={() => reorderScenes(index, index - 1)} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30">
                    <ArrowUp size={16} />
                  </button>
                  <button disabled={index === story.scenes.length - 1} onClick={() => reorderScenes(index, index + 1)} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30">
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>
              <button onClick={() => { if(confirm("Are you sure you want to delete this scene?")) removeScene(scene.id); }} className="text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1">
                <Trash2 size={16} /> Delete
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1 flex flex-col gap-4">
                <div className="h-[180px] w-full bg-[#f5f5f5] rounded-xl flex items-center justify-center gap-2 p-2 border-2 border-slate-200">
                  {scene.mediaUrls.map((url, mediaIndex) => (
                    <div key={mediaIndex} className="relative h-full flex-1 group">
                      {scene.mediaType === 'video' ? (
                        <video src={url} className="w-full h-full object-contain" controls />
                      ) : (
                        <img src={url} alt={`Scene media ${mediaIndex + 1}`} className="w-full h-full object-contain" />
                      )}
                      <button onClick={() => removeMediaFromScene(scene.id, mediaIndex)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {scene.mediaUrls.length < 2 && (
                    <button onClick={() => handleAddMediaClick(scene.id)} className="h-full flex-1 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-violet-300 hover:text-violet-500 transition-all">
                      <ImagePlus size={24} />
                      <span className="text-xs font-semibold mt-1">Add Media</span>
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {!recordingSceneId && !scene.audioUrl && (
                    <button onClick={() => startRecording(scene.id)} className="flex-1 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all flex items-center justify-center gap-2 text-sm font-semibold">
                      <Mic size={16} /> Record
                    </button>
                  )}
                  {recordingSceneId === scene.id && (
                    <button onClick={stopRecording} className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl animate-pulse flex items-center justify-center gap-2 text-sm font-semibold">
                      <StopCircle size={16} /> Stop
                    </button>
                  )}
                  {scene.audioUrl && (
                    <div className="flex-1 flex gap-2">
                      <audio src={scene.audioUrl} controls className="w-full h-8" />
                      <button onClick={() => { if(confirm("Delete recording?")) setAudio(scene.id, ''); }} className="p-1 text-red-400 hover:bg-red-50 rounded">
                         <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Narrative</label>
                  <textarea dir={textDir} className={`w-full p-3 bg-slate-50 border-2 rounded-xl focus:bg-white transition-all outline-none resize-none h-32 text-slate-800 leading-relaxed border-slate-100 focus:border-violet-400 ${(story.languageMode === 'ar' || story.languageMode === 'bilingual') ? 'font-arabic' : ''}`} value={scene.narrative} onChange={(e) => updateScene(scene.id, 'narrative', e.target.value)} placeholder={story.languageMode === 'ar' ? "اكتب وصف المشهد هنا..." : "Write the scene narrative here..."} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Dialogue</label>
                  <textarea dir={textDir} className={`w-full p-3 bg-violet-50/50 border-2 border-violet-100 rounded-xl focus:bg-white focus:border-violet-400 transition-all outline-none resize-none h-24 text-slate-800 leading-relaxed ${(story.languageMode === 'ar' || story.languageMode === 'bilingual') ? 'font-arabic' : ''}`} value={scene.dialogue} onChange={(e) => updateScene(scene.id, 'dialogue', e.target.value)} placeholder={story.languageMode === 'ar' ? "سعد: مرحبا...\nريم: أهلاً..." : "Saad: Hello...\nReem: Hi..."} />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="pt-6">
        <button onClick={() => addScene()} className="w-full py-6 border-2 border-dashed border-slate-300 rounded-3xl text-slate-500 font-bold text-lg hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group">
          <div className="bg-slate-200 text-slate-500 rounded-full p-2 group-hover:bg-slate-300 transition-colors">
            <Plus size={24} />
          </div>
          Add Empty Scene
        </button>
      </div>

      <div className="flex justify-center pt-8">
        <button onClick={onPreview} className="px-12 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xl rounded-2xl shadow-xl shadow-violet-200 hover:shadow-2xl hover:-translate-y-1 transition-all">
          Preview & Export Story
        </button>
      </div>
    </div>
  );
};