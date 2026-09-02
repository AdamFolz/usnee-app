import { useState } from 'react';
import { krea } from '../services/krea';
import { LoadingSpinner } from './LoadingSpinner';

interface KreaImageGeneratorProps {
  onImageGenerated?: (url: string) => void;
  initialValue?: string;
}

export function KreaImageGenerator({ onImageGenerated, initialValue }: KreaImageGeneratorProps) {
  const [prompt, setPrompt] = useState(initialValue || '');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = await krea.generateImage({
        prompt,
        aspect_ratio: '16:9',
        resolution: '1K',
      });

      setImageUrl(url);
      onImageGenerated?.(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Введите описание изображения..."
          className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/50 resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && generateImage()}
        />
      </div>

      <button
        onClick={generateImage}
        disabled={isLoading || !prompt.trim()}
        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25"
      >
        {isLoading ? 'Генерирую...' : 'Сгенерировать изображение'}
      </button>

      {isLoading && <LoadingSpinner />}

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {imageUrl && (
        <div className="relative group">
          <img
            src={imageUrl}
            alt="Сгенерированное изображение"
            className="w-full rounded-xl shadow-2xl transition-all duration-500 group-hover:scale-[1.01]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl pointer-events-none" />
        </div>
      )}
    </div>
  );
}