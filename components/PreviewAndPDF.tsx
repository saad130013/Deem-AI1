import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { useStoryStore } from '../store';
import { Scene } from '../types';

interface PreviewProps {
  onEdit: () => void;
}

// --- Helpers ---

const cleanText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/<!--.*?-->/g, '')
    .replace(/\*\*/g, '')
    .trim();
};

const getVideoThumbnail = async (videoUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    video.currentTime = 1;

    const onLoaded = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640; 
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve(''); 
      }
      video.remove();
    };

    video.onseeked = onLoaded;
    video.onerror = () => resolve(''); 
    video.load();
  });
};

export const PreviewAndPDF: React.FC<PreviewProps> = ({ onEdit }) => {
  const { story } = useStoryStore();
  const pagesRef = useRef<(HTMLDivElement | null)[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingType, setLoadingType] = useState<'PDF' | 'PPT' | null>(null);

  const getFooterString = () => 
    `حقوق البرنامج محفوظة للطالبة: ديم سعد البقمي - ثالث ابتدائي- مدارس الاندلس الاهلية بالحمدانية`;

  const getLayoutType = (scene: Scene) => {
    const totalChars = (scene.narrative || '').length + (scene.dialogue || '').length;
    return totalChars >= 150 ? 'TWO_COLUMN' : 'STANDARD';
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    setLoadingType('PDF');
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;

      const validPages = pagesRef.current.filter(Boolean);

      for (let i = 0; i < validPages.length; i++) {
        const pageEl = validPages[i]!;
        
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#fef9e8'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        
        if (i > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      doc.save(`${story.title.replace(/\s+/g, '_')}.pdf`);

    } catch (err) {
      console.error("PDF generation error", err);
      alert("PDF Export failed.");
    } finally {
      setIsGenerating(false);
      setLoadingType(null);
    }
  };

  const generatePPT = async () => {
    setIsGenerating(true);
    setLoadingType('PPT');
    
    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      pptx.rtlMode = true;

      const footerStr = getFooterString();

      const slide1 = pptx.addSlide();
      slide1.background = { color: 'FEF9E8' };
      slide1.addText(story.title, { x: '10%', y: '25%', w: '80%', h: 1, fontSize: 44, align: 'center', bold: true, color: '1E3A8A', fontFace: 'Cairo' });
      slide1.addText(`Student Name: ${story.studentName}`, { x: '10%', y: '50%', w: '80%', h: 0.5, fontSize: 24, align: 'center', color: 'EA580C', fontFace: 'Cairo', bold: true });
      slide1.addText(`Grade: ${story.grade}`, { x: '10%', y: '60%', w: '80%', h: 0.4, fontSize: 20, align: 'center', color: '475569', fontFace: 'Cairo' });
      slide1.addText(`School: ${story.schoolName}`, { x: '10%', y: '68%', w: '80%', h: 0.4, fontSize: 20, align: 'center', color: '475569', fontFace: 'Cairo' });
      slide1.addText(footerStr, { x: 0, y: '92%', w: '100%', h: 0.4, fontSize: 10, color: '666666', align: 'center', fontFace: 'Cairo' });

      for (const scene of story.scenes) {
        // This logic remains largely the same but needs to handle multiple images
        // For simplicity in PPTX, we'll just show the first image if multiple exist.
        let mediaData = scene.mediaUrls[0]; 
        if (scene.mediaType === 'video') {
           const thumb = await getVideoThumbnail(scene.mediaUrls[0]);
           if (thumb) mediaData = thumb;
        }

        const narrativeClean = cleanText(scene.narrative);
        const dialogueClean = cleanText(scene.dialogue);
        const fullText = [narrativeClean, dialogueClean].filter(Boolean).join('\n\n');

        const CHAR_LIMIT = 800;
        const slidesText = fullText.length > CHAR_LIMIT 
          ? [fullText.slice(0, Math.ceil(fullText.length/2)), fullText.slice(Math.ceil(fullText.length/2))]
          : [fullText];

        slidesText.forEach((txtSegment, idx) => {
            const isContinuation = idx > 0;
            const slide = pptx.addSlide();
            slide.background = { color: 'FEF9E8' };
            slide.addText(footerStr, { x: 0, y: '92%', w: '100%', h: 0.4, fontSize: 10, color: '666666', align: 'center', fontFace: 'Cairo' });

            const charCount = fullText.length;
            const layout = (charCount < 150) ? 'STANDARD' : 'TWO_COLUMN';
            
            let imgX, imgY, imgW, imgH, txtX, txtY, txtW, txtH, iconX, iconY;
            if (layout === 'STANDARD') {
                imgX = '5%'; imgY = '10%'; imgW = '90%'; imgH = '50%';
                txtX = '5%'; txtY = '62%'; txtW = '90%'; txtH = '30%';
                iconX = '88%'; iconY = '52%';
            } else {
                imgX = '5%'; imgY = '10%'; imgW = '40%'; imgH = '80%';
                txtX = '50%'; txtY = '10%'; txtW = '45%'; txtH = '80%';
                iconX = '38%'; iconY = '82%';
            }

            if (isContinuation) {
                txtX = '5%'; txtY = '10%'; txtW = '90%'; txtH = '80%';
            } else {
                if (mediaData) {
                    slide.addImage({ data: mediaData, x: imgX, y: imgY, w: imgW, h: imgH, sizing: { type: 'contain', w: imgW, h: imgH } });
                    if (scene.mediaType === 'video') {
                        slide.addText("▶️", { x: iconX, y: iconY, w: 0.5, h: 0.5, fontSize: 14, align: 'center' });
                    }
                } else {
                    slide.addShape(pptx.ShapeType.rect, { x: imgX, y: imgY, w: imgW, h: imgH, fill: { color: 'CCCCCC' } });
                    slide.addText("⚠️ تعذر تحميل الصورة", { x: imgX, y: imgY, w: imgW, h: imgH, fontSize: 12, color: 'FF0000', align: 'center', fontFace: 'Cairo' });
                }
            }
            const textObjects = [];
            const paragraphs = txtSegment.split('\n');
            paragraphs.forEach(para => {
                if (!para.trim()) return;
                const isArabic = /[\u0600-\u06FF]/.test(para);
                textObjects.push({ text: para, options: { fontFace: isArabic ? 'Cairo' : 'Arial', fontSize: isArabic ? 24 : 20, align: isArabic ? 'right' : 'left', color: '000000', rtlMode: isArabic, breakLine: true } });
                textObjects.push({ text: '\n', options: { fontSize: 10, breakLine: true } });
            });
            slide.addText(textObjects, { x: txtX, y: txtY, w: txtW, h: txtH, valign: 'top', autoFit: true, fit: 'shrink' });
        });
      }

      await pptx.writeFile({ fileName: `${story.title}_Story.pptx` });

    } catch (err) {
      console.error(err);
      alert("PPT Export failed. Please check console.");
    } finally {
      setIsGenerating(false);
      setLoadingType(null);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-8 pb-20">
      <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-200 flex gap-4 transition-all">
         <button onClick={onEdit} className="text-slate-600 font-bold hover:text-slate-900 px-4 py-2">
           ← Back to Editor
         </button>
         <button onClick={generatePPT} disabled={isGenerating} className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold shadow hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
            {loadingType === 'PPT' ? 'Generating...' : 'Export PowerPoint'}
         </button>
         <button onClick={generatePDF} disabled={isGenerating} className="bg-violet-600 text-white px-6 py-2 rounded-xl font-bold shadow hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2">
            {loadingType === 'PDF' ? 'Generating...' : 'Export PDF'}
         </button>
      </div>
      
      <div className="w-full flex flex-col items-center gap-8 bg-slate-100 p-8 rounded-3xl border border-slate-200 shadow-inner overflow-auto max-h-[80vh]">
        
        <div 
          ref={(el) => { pagesRef.current[0] = el; }}
          className="bg-[#fef9e8] w-[210mm] min-h-[297mm] shadow-2xl relative p-[20mm] flex flex-col items-center justify-center box-border border border-slate-200"
        >
            <div className="border-4 border-double border-violet-200 p-12 w-full h-full rounded-3xl flex flex-col items-center justify-center gap-12 bg-white/30 backdrop-blur-sm">
                <div className="space-y-6 text-center w-full">
                     <h1 className="font-arabic text-6xl font-extrabold text-violet-900 leading-tight mb-2 break-words">
                        {story.title}
                     </h1>
                     <div className="w-32 h-2 bg-orange-400 mx-auto rounded-full"></div>
                </div>
                <div className="flex flex-col gap-6 text-2xl font-arabic text-slate-700 w-full max-w-xl bg-white/60 p-10 rounded-3xl shadow-sm border border-violet-100">
                     <div className="flex justify-between items-center border-b border-dashed border-slate-300 pb-4">
                         <span className="font-bold text-violet-600">Student Name</span>
                         <span className="font-semibold text-slate-800">{story.studentName}</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-dashed border-slate-300 pb-4">
                         <span className="font-bold text-violet-600">Grade</span>
                         <span className="font-semibold text-slate-800">{story.grade}</span>
                     </div>
                     <div className="flex justify-between items-center pb-2">
                         <span className="font-bold text-violet-600">School</span>
                         <span className="font-semibold text-slate-800">{story.schoolName}</span>
                     </div>
                </div>
                <div className="mt-auto pt-12 text-slate-400 font-bold flex items-center gap-2">
                     <span>📖</span> StoryWeaver
                </div>
            </div>
        </div>

        {story.scenes.map((scene, index) => {
          const layout = getLayoutType(scene);
          return (
            <div 
               key={scene.id}
               ref={(el) => { pagesRef.current[index + 1] = el; }}
               className="bg-[#fef9e8] w-[210mm] min-h-[297mm] shadow-2xl relative p-[15mm] flex flex-col box-border"
            >
              <div className="flex-grow flex flex-col relative pt-4">
                <div className={`w-full flex justify-center mb-6 shrink-0 ${scene.mediaUrls.length === 2 ? 'gap-4' : ''}`}>
                  {scene.mediaUrls.map((url, mediaIndex) => (
                    <div key={mediaIndex} className={`flex justify-center items-center ${scene.mediaUrls.length === 2 ? 'w-1/2' : 'w-full'}`}>
                      {scene.mediaType === 'video' ? (
                        <div className={`w-full bg-black flex items-center justify-center text-white rounded-lg ${layout === 'TWO_COLUMN' ? 'h-[70mm]' : 'h-[110mm]'}`}>
                          <span className="text-4xl">▶️</span>
                        </div>
                      ) : (
                        <img 
                          src={url} 
                          className={`max-w-full object-contain rounded-lg shadow-sm ${layout === 'TWO_COLUMN' ? 'max-h-[80mm]' : 'max-h-[140mm]'}`}
                          alt={`Scene media ${mediaIndex + 1}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className={`w-full space-y-6 ${layout === 'TWO_COLUMN' ? 'text-lg' : 'text-2xl'}`}>
                   <div className="font-arabic text-right text-slate-800 whitespace-pre-wrap leading-loose" dir="rtl">
                      {cleanText(scene.narrative)}
                   </div>
                   {scene.dialogue && (
                     <div className="bg-white/50 p-4 rounded-xl border border-blue-100 font-arabic text-right text-slate-700 whitespace-pre-wrap leading-loose" dir="rtl">
                        {cleanText(scene.dialogue)}
                     </div>
                   )}
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-slate-200 text-center flex justify-between text-xs text-slate-400">
                 <span>Page {index + 1}</span>
                 <p className="font-arabic font-bold text-slate-500">
                    {getFooterString()}
                 </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};