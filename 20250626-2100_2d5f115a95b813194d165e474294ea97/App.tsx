
import React, { useState, useEffect, useCallback } from 'react';
import { fetchGameUpdate, generateAdventureImage } from './services/geminiService';
import { GameChoice, GeminiStoryResponse } from './types';
import StoryDisplay from './components/StoryDisplay';
import ImageDisplay from './components/ImageDisplay';
import ChoiceButton from './components/ChoiceButton';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';

const App: React.FC = () => {
  const [currentStory, setCurrentStory] = useState<string>('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentImagePrompt, setCurrentImagePrompt] = useState<string | null>(null);
  const [choices, setChoices] = useState<GameChoice[]>([]);
  
  const [isLoadingStory, setIsLoadingStory] = useState<boolean>(true);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyAvailable, setApiKeyAvailable] = useState<boolean>(false);

  const loadInitialGameData = useCallback(async () => {
    setError(null);
    setIsLoadingStory(true);
    setIsLoadingImage(true);
    setCurrentImage(null);

    try {
      const initialData: GeminiStoryResponse = await fetchGameUpdate(null, null);
      setCurrentStory(initialData.new_story_segment);
      setChoices(initialData.choices.map((text, index) => ({ id: `choice-${Date.now()}-${index}`, text })));
      setCurrentImagePrompt(initialData.image_prompt);

      if (initialData.image_prompt) {
        const imageBlob = await generateAdventureImage(initialData.image_prompt);
        setCurrentImage(imageBlob);
      } else {
         setCurrentImage(null);
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : '不明なエラーが発生しました。';
      setError(`冒険の開始に失敗しました: ${err}`);
      console.error(e);
    } finally {
      setIsLoadingStory(false);
      setIsLoadingImage(false);
    }
  }, []);

  useEffect(() => {
    if (typeof process.env.API_KEY === 'string' && process.env.API_KEY.trim() !== '') {
        setApiKeyAvailable(true);
        loadInitialGameData();
    } else {
        setError("重要: API_KEY環境変数が設定されていないか空です。アプリケーションを使用するには設定してください。");
        setApiKeyAvailable(false);
        setIsLoadingStory(false);
        setIsLoadingImage(false);
    }
  }, [loadInitialGameData]);


  const handleChoice = async (choiceText: string) => {
    setError(null);
    setIsLoadingStory(true);
    setIsLoadingImage(true);
    setCurrentImage(null);

    try {
      const nextData: GeminiStoryResponse = await fetchGameUpdate(currentStory, choiceText);
      setCurrentStory(nextData.new_story_segment);
      setChoices(nextData.choices.map((text, index) => ({ id: `choice-${Date.now()}-${index}`, text })));
      setCurrentImagePrompt(nextData.image_prompt);

      if (nextData.image_prompt) {
        const imageBlob = await generateAdventureImage(nextData.image_prompt);
        setCurrentImage(imageBlob);
      } else {
        setCurrentImage(null);
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : 'ゲームプレイ中に不明なエラーが発生しました。';
      setError(`問題が発生しました: ${err}`);
      console.error(e);
    } finally {
      setIsLoadingStory(false);
      setIsLoadingImage(false);
    }
  };

  const handleRestart = () => {
    setCurrentStory('');
    setCurrentImage(null);
    setCurrentImagePrompt(null);
    setChoices([]);
    loadInitialGameData();
  };

  if (!apiKeyAvailable && error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 game-container">
            <div className="w-full max-w-xl text-center">
                <h1 className="text-4xl font-bold text-purple-400 mb-6">Geminiテキストアドベンチャー</h1>
                <ErrorDisplay message={error} isCritical={true} />
                 <p className="text-gray-400 mt-4">このアプリケーションが機能するためには、<code>API_KEY</code>環境変数がデプロイ環境で正しく設定されていることを確認してください。</p>
            </div>
        </div>
      );
  }


  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-8 game-container bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      <header className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 mb-2">
          Geminiテキストアドベンチャー
        </h1>
        <p className="text-gray-400 text-lg">あなたの選択が世界を形作ります。どんな道を切り開きますか？</p>
      </header>

      <main className="w-full max-w-4xl lg:max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-1 flex flex-col">
          <ImageDisplay imageUrl={currentImage} imagePrompt={currentImagePrompt} isLoadingImage={isLoadingImage} />
        </div>

        <div className="lg:col-span-1 flex flex-col">
          {isLoadingStory && !currentStory ? ( 
            <div className="flex flex-col items-center justify-center h-64 bg-gray-800 rounded-lg p-6">
              <LoadingSpinner />
              <p className="mt-4 text-gray-400">冒険を創作中...</p>
            </div>
          ) : (
            <>
              <StoryDisplay story={currentStory || "冒険が待っています..."} />
              <ErrorDisplay message={error} />
              {choices.length > 0 && !isLoadingStory && (
                <div className="mt-4 space-y-3">
                  <h2 className="text-2xl font-semibold text-purple-300 mb-3">道を選んでください：</h2>
                  {choices.map((choice) => (
                    <ChoiceButton
                      key={choice.id}
                      choiceText={choice.text}
                      onChoose={handleChoice}
                      disabled={isLoadingStory || isLoadingImage}
                    />
                  ))}
                </div>
              )}
               {(isLoadingStory || isLoadingImage) && choices.length > 0 && ( 
                 <div className="mt-6 flex flex-col items-center justify-center">
                    <LoadingSpinner size="w-10 h-10"/>
                    <p className="mt-2 text-gray-400">世界があなたの選択に反応しています...</p>
                 </div>
               )}
            </>
          )}
        </div>
      </main>
      
      <footer className="w-full max-w-4xl text-center mt-12 mb-6">
        <button
            onClick={handleRestart}
            disabled={isLoadingStory || isLoadingImage}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
        >
            冒険をリスタート
        </button>
        <p className="text-sm text-gray-500 mt-4">
            Gemini & Imagen搭載。冒険が待っています！
        </p>
      </footer>
    </div>
  );
};

export default App;