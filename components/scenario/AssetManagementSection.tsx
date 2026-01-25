import React, { useState, useMemo } from 'react';
import { CharacterAsset, PropAsset, BackgroundAsset } from '../../types';
import { useProject } from '../../contexts/ProjectContext';
import { AssetCreatorModal } from '../character/AssetCreatorModal';

type AssetCategory = 'character' | 'prop' | 'background';

// Icons
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

// Asset Card Component
const AssetCard: React.FC<{
  asset: CharacterAsset | PropAsset | BackgroundAsset;
  type: AssetCategory;
  isActive: boolean;
  onToggleActive: () => void;
  onDelete: () => void;
}> = ({ asset, type, isActive, onToggleActive, onDelete }) => {
  return (
    <div
      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
        isActive
          ? 'border-indigo-500 ring-2 ring-indigo-500/30'
          : 'border-gray-600 hover:border-gray-500'
      }`}
      onClick={onToggleActive}
    >
      {/* Image */}
      <div className="aspect-square bg-gray-700">
        <img
          src={`data:${asset.image.mimeType};base64,${asset.image.data}`}
          alt={asset.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-1 right-1">
          <CheckCircleIcon className="w-5 h-5 text-indigo-400" />
        </div>
      )}

      {/* Delete button (on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-1 left-1 p-1 bg-red-600/80 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        title="삭제"
      >
        <TrashIcon className="w-3 h-3 text-white" />
      </button>

      {/* Name */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
        <p className="text-xs text-white truncate">{asset.name}</p>
      </div>
    </div>
  );
};

export const AssetManagementSection: React.FC = () => {
  const {
    characters,
    props,
    backgrounds,
    removeCharacter,
    removeProp,
    removeBackground,
    activeCharacterIds,
    toggleActiveCharacter,
    activePropIds,
    toggleActiveProp,
    activeBackgroundId,
    setActiveBackgroundId,
  } = useProject();

  const [isExpanded, setIsExpanded] = useState(true);
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('character');
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [creatorMode, setCreatorMode] = useState<'ai' | 'upload'>('ai');

  // 총 에셋 수
  const totalAssets = characters.length + props.length + backgrounds.length;

  // 카테고리별 탭
  const categories: { key: AssetCategory; label: string; count: number }[] = [
    { key: 'character', label: '캐릭터', count: characters.length },
    { key: 'prop', label: '소품', count: props.length },
    { key: 'background', label: '배경', count: backgrounds.length },
  ];

  const handleDeleteAsset = (id: string, type: AssetCategory) => {
    if (type === 'character') {
      removeCharacter(id);
    } else if (type === 'prop') {
      removeProp(id);
    } else {
      removeBackground(id);
    }
  };

  const handleToggleActive = (id: string, type: AssetCategory) => {
    if (type === 'character') {
      toggleActiveCharacter(id);
    } else if (type === 'prop') {
      toggleActiveProp(id);
    } else {
      // 배경은 단일 선택
      setActiveBackgroundId(activeBackgroundId === id ? null : id);
    }
  };

  const isAssetActive = (id: string, type: AssetCategory): boolean => {
    if (type === 'character') {
      return activeCharacterIds.includes(id);
    } else if (type === 'prop') {
      return activePropIds.includes(id);
    } else {
      return activeBackgroundId === id;
    }
  };

  const openCreatorModal = (mode: 'ai' | 'upload') => {
    setCreatorMode(mode);
    setIsCreatorModalOpen(true);
  };

  // 현재 카테고리의 에셋 목록
  const currentAssets = useMemo(() => {
    if (activeCategory === 'character') return characters;
    if (activeCategory === 'prop') return props;
    return backgrounds;
  }, [activeCategory, characters, props, backgrounds]);

  if (totalAssets === 0 && !isCreatorModalOpen) {
    return null; // 에셋이 없으면 숨김
  }

  return (
    <div className="border-t border-gray-700 bg-gray-800/50">
      {/* 헤더 (접기/펼치기) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <span className="text-sm font-medium text-gray-300">
            생성된 에셋
          </span>
          <span className="text-xs text-gray-500">
            ({characters.length}캐릭터, {props.length}소품, {backgrounds.length}배경)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openCreatorModal('ai');
            }}
            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors flex items-center gap-1"
          >
            <PlusIcon className="w-3 h-3" />
            AI 생성
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openCreatorModal('upload');
            }}
            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors flex items-center gap-1"
          >
            <PlusIcon className="w-3 h-3" />
            업로드
          </button>
        </div>
      </button>

      {/* 콘텐츠 */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* 카테고리 탭 */}
          <div className="flex gap-1 mb-3">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  activeCategory === cat.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          {/* 에셋 그리드 */}
          {currentAssets.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {currentAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  type={activeCategory}
                  isActive={isAssetActive(asset.id, activeCategory)}
                  onToggleActive={() => handleToggleActive(asset.id, activeCategory)}
                  onDelete={() => handleDeleteAsset(asset.id, activeCategory)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              {activeCategory === 'character' && '캐릭터가 없습니다. 제안된 캐릭터를 생성하거나 직접 추가하세요.'}
              {activeCategory === 'prop' && '소품이 없습니다. AI 생성 또는 업로드로 추가하세요.'}
              {activeCategory === 'background' && '배경이 없습니다. AI 생성 또는 업로드로 추가하세요.'}
            </p>
          )}

          {/* 활성화 안내 */}
          <p className="text-xs text-gray-500 mt-2">
            클릭하여 이미지 생성 시 참조할 에셋을 선택하세요.
            {activeCategory === 'character' && ` (선택됨: ${activeCharacterIds.length}/5)`}
            {activeCategory === 'prop' && ` (선택됨: ${activePropIds.length}/5)`}
            {activeCategory === 'background' && ` (선택됨: ${activeBackgroundId ? '1' : '0'}/1)`}
          </p>
        </div>
      )}

      {/* 에셋 생성 모달 */}
      {isCreatorModalOpen && (
        <AssetCreatorModal
          isOpen={isCreatorModalOpen}
          onClose={() => setIsCreatorModalOpen(false)}
          category={activeCategory}
          mode={creatorMode}
        />
      )}
    </div>
  );
};

export default AssetManagementSection;
