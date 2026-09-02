import { useState } from 'react';
import { KreaImageGenerator } from '../components/KreaImageGenerator';
import { useToast } from '../components/ui/Toast';
import { ArrowLeftIcon, SparklesIcon } from 'lucide-react';
import { Surface } from '../components/ui/Surface';

export function KreaGenerator() {
  const [images, setImages] = useState<string[]>([]);
  const { showToast } = useToast();

  const handleImageGenerated = (url: string) => {
    setImages((prev) => [url, ...prev].slice(0, 5)); // Keep last 5 images
    showToast({ title: 'Успех!', detail: 'Изображение успешно сгенерировано', tone: 'success' });
  };

  return (
    <div className="flex flex-col h-full bg-usnee-bg text-white">
      <header className="flex items-center gap-3 p-4 mb-2">
        <a href="/" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeftIcon size={20} />
        </a>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <SparklesIcon size={24} className="text-purple-400" />
          AI Генератор
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <Surface className="mb-6">
          <KreaImageGenerator 
            onImageGenerated={handleImageGenerated}
          />
        </Surface>

        {images.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Сгенерированные изображения</h2>
            <div className="grid grid-cols-2 gap-4">
              {images.map((url, index) => (
                <div 
                  key={index} 
                  className="relative group rounded-xl overflow-hidden shadow-xl transition-all duration-500"
                >
                  <img 
                    src={url} 
                    alt={`Сгенерированное изображение ${index + 1}`}
                    className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}