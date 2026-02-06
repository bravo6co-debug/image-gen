import React, { useRef, useEffect } from 'react';
import { ClearIcon } from '../Icons';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  clipNumber: number;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  clipNumber,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="relative w-full max-w-4xl h-[90vh] sm:h-auto">
        <button
          onClick={onClose}
          className="absolute -top-10 right-2 sm:right-0 text-white hover:text-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ClearIcon className="w-8 h-8" />
        </button>
        <div className="bg-gray-900 rounded-t-2xl sm:rounded-xl overflow-hidden h-full sm:h-auto flex flex-col">
          <div className="p-3 bg-gray-800 border-b border-gray-700">
            <h3 className="text-sm sm:text-base text-white font-medium">클립 #{clipNumber} 미리보기</h3>
          </div>
          <div className="aspect-video bg-black flex-shrink-0">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full"
            >
              브라우저가 비디오 재생을 지원하지 않습니다.
            </video>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;
