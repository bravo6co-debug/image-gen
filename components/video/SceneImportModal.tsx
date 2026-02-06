import React, { useState } from 'react';
import { Scene } from '../../types';
import { ClearIcon } from '../Icons';

interface SceneImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  onImport: (sceneIds: string[]) => void;
}

export const SceneImportModal: React.FC<SceneImportModalProps> = ({
  isOpen,
  onClose,
  scenes,
  onImport,
}) => {
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const scenesWithImages = scenes.filter(s => s.generatedImage || s.customImage);

  const toggleScene = (sceneId: string) => {
    setSelectedSceneIds(prev =>
      prev.includes(sceneId)
        ? prev.filter(id => id !== sceneId)
        : [...prev, sceneId]
    );
  };

  const handleImport = () => {
    onImport(selectedSceneIds);
    setSelectedSceneIds([]);
    onClose();
  };

  const selectAll = () => {
    setSelectedSceneIds(scenesWithImages.map(s => s.id));
  };

  const deselectAll = () => {
    setSelectedSceneIds([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-4xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700">
          <h3 className="text-sm sm:text-lg font-bold text-white">씬 가져오기</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ClearIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-2 sm:p-4 border-b border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs sm:text-sm text-gray-400">
              {scenesWithImages.length}개 / 선택: {selectedSceneIds.length}개
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={selectAll}
                className="text-xs text-blue-400 hover:text-blue-300 min-h-[44px] px-2 flex items-center"
              >
                전체 선택
              </button>
              <button
                onClick={deselectAll}
                className="text-xs text-gray-400 hover:text-gray-300 min-h-[44px] px-2 flex items-center"
              >
                해제
              </button>
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-2 sm:p-4">
          {scenesWithImages.length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-xs sm:text-sm">
              이미지가 있는 씬이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {scenesWithImages.map((scene) => {
                const image = scene.customImage || scene.generatedImage;
                const isSelected = selectedSceneIds.includes(scene.id);
                return (
                  <div
                    key={scene.id}
                    onClick={() => toggleScene(scene.id)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                      ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-700 hover:border-gray-600'}
                    `}
                  >
                    <div className="aspect-video bg-gray-900">
                      {image && (
                        <img
                          src={`data:${image.mimeType};base64,${image.data}`}
                          alt={`Scene ${scene.sceneNumber}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-900/80 rounded text-[10px] sm:text-xs text-white font-bold">
                      #{scene.sceneNumber}
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                    <div className="p-1.5 sm:p-2 bg-gray-800">
                      <p className="text-[10px] sm:text-xs text-gray-400 truncate">{scene.visualDescription}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 sm:gap-3 p-3 sm:p-4 border-t border-gray-700 flex-wrap">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-300 bg-gray-600 rounded-lg hover:bg-gray-500 min-h-[44px]"
          >
            취소
          </button>
          <button
            onClick={handleImport}
            disabled={selectedSceneIds.length === 0}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {selectedSceneIds.length}개 씬 가져오기
          </button>
        </div>
      </div>
    </div>
  );
};

export default SceneImportModal;
