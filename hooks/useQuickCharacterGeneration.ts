import { useState, useCallback } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { CharacterAsset, CharacterRole, SuggestedCharacter, ImageStyle } from '../types';
import { extractCharacterData, generateCharacterPortraits } from '../services/geminiService';

interface UseQuickCharacterGenerationReturn {
  isGenerating: boolean;
  generatingCharacterName: string | null;
  error: string | null;
  generateCharacter: (char: SuggestedCharacter) => Promise<CharacterAsset | null>;
  generateAllMissing: (
    chars: SuggestedCharacter[],
    existingCharacterNames: string[],
    onProgress?: (current: number, total: number) => void
  ) => Promise<CharacterAsset[]>;
  clearError: () => void;
}

// 역할 매핑: suggestedCharacter.role → CharacterRole
const mapRoleToCharacterRole = (role: string): CharacterRole => {
  const normalized = role.toLowerCase().trim();
  if (normalized.includes('주인공') || normalized.includes('main') || normalized.includes('protagonist')) {
    return 'protagonist';
  }
  if (normalized.includes('조연') || normalized.includes('supporting')) {
    return 'supporting';
  }
  return 'extra'; // 단역 또는 기타
};

export const useQuickCharacterGeneration = (): UseQuickCharacterGenerationReturn => {
  const {
    addCharacter,
    toggleActiveCharacter,
    aspectRatio,
    imageStyle,
  } = useProject();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingCharacterName, setGeneratingCharacterName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 단일 캐릭터 생성
  const generateCharacter = useCallback(
    async (char: SuggestedCharacter): Promise<CharacterAsset | null> => {
      setIsGenerating(true);
      setGeneratingCharacterName(char.name);
      setError(null);

      try {
        // 1. 캐릭터 정보 추출 (이름, 나이, 성격, 의상, 영어 설명)
        const extractedData = await extractCharacterData(char.description);

        // 2. 역할 매핑
        const characterRole = mapRoleToCharacterRole(char.role);

        // 3. 이미지 생성 (1장)
        const images = await generateCharacterPortraits(
          extractedData.englishDescription,
          1,
          aspectRatio,
          imageStyle
        );

        if (!images || images.length === 0) {
          throw new Error('이미지 생성에 실패했습니다.');
        }

        // 4. CharacterAsset 생성
        const newCharacter: CharacterAsset = {
          id: crypto.randomUUID(),
          name: extractedData.name || char.name,
          role: characterRole,
          image: images[0],
          description: char.description,
          maintainContext: characterRole !== 'extra', // 주인공/조연만 컨텍스트 유지
          age: extractedData.age || '',
          personality: extractedData.personality || '',
          outfit: extractedData.outfit || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // 5. Context에 추가
        addCharacter(newCharacter);

        // 6. 자동으로 활성화 (주인공/조연만)
        if (characterRole !== 'extra') {
          toggleActiveCharacter(newCharacter.id);
        }

        return newCharacter;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '캐릭터 생성에 실패했습니다.';
        setError(errorMessage);
        console.error('Quick character generation failed:', err);
        return null;
      } finally {
        setIsGenerating(false);
        setGeneratingCharacterName(null);
      }
    },
    [addCharacter, toggleActiveCharacter, aspectRatio, imageStyle]
  );

  // 모든 미생성 캐릭터 일괄 생성
  const generateAllMissing = useCallback(
    async (
      chars: SuggestedCharacter[],
      existingCharacterNames: string[],
      onProgress?: (current: number, total: number) => void
    ): Promise<CharacterAsset[]> => {
      // 이미 생성된 캐릭터 필터링
      const missingChars = chars.filter(
        (char) =>
          !existingCharacterNames.some(
            (name) => name.toLowerCase() === char.name.toLowerCase()
          )
      );

      if (missingChars.length === 0) {
        return [];
      }

      setIsGenerating(true);
      setError(null);

      const createdCharacters: CharacterAsset[] = [];

      for (let i = 0; i < missingChars.length; i++) {
        const char = missingChars[i];
        setGeneratingCharacterName(char.name);
        onProgress?.(i + 1, missingChars.length);

        try {
          // 1. 캐릭터 정보 추출
          const extractedData = await extractCharacterData(char.description);

          // 2. 역할 매핑
          const characterRole = mapRoleToCharacterRole(char.role);

          // 3. 이미지 생성 (1장)
          const images = await generateCharacterPortraits(
            extractedData.englishDescription,
            1,
            aspectRatio,
            imageStyle
          );

          if (images && images.length > 0) {
            // 4. CharacterAsset 생성
            const newCharacter: CharacterAsset = {
              id: crypto.randomUUID(),
              name: extractedData.name || char.name,
              role: characterRole,
              image: images[0],
              description: char.description,
              maintainContext: characterRole !== 'extra',
              age: extractedData.age || '',
              personality: extractedData.personality || '',
              outfit: extractedData.outfit || '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            // 5. Context에 추가
            addCharacter(newCharacter);

            // 6. 자동으로 활성화 (주인공/조연만)
            if (characterRole !== 'extra') {
              toggleActiveCharacter(newCharacter.id);
            }

            createdCharacters.push(newCharacter);
          }
        } catch (err) {
          console.error(`Failed to generate character "${char.name}":`, err);
          // 개별 실패는 무시하고 계속 진행
        }
      }

      setIsGenerating(false);
      setGeneratingCharacterName(null);

      if (createdCharacters.length === 0 && missingChars.length > 0) {
        setError('모든 캐릭터 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }

      return createdCharacters;
    },
    [addCharacter, toggleActiveCharacter, aspectRatio, imageStyle]
  );

  return {
    isGenerating,
    generatingCharacterName,
    error,
    generateCharacter,
    generateAllMissing,
    clearError,
  };
};

export default useQuickCharacterGeneration;
