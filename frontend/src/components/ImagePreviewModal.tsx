import React, { useEffect } from 'react';
import { X, Download } from 'lucide-react';
import './ImagePreviewModal.css';

interface ImagePreviewModalProps {
  src: string;
  alt?: string;
  onClose: () => void;
  showDownload?: boolean;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ 
  src, 
  alt = 'Image Preview', 
  onClose,
  showDownload = true 
}) => {
  // Handle escape key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = src;
    link.download = `incident_evidence_${new Date().getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="image-preview-overlay" onClick={onClose}>
      <div className="preview-controls">
        {showDownload && (
          <button 
            className="preview-btn download-btn" 
            onClick={handleDownload}
            title="Download Image"
          >
            <Download size={20} />
            <span>Download</span>
          </button>
        )}
        <button 
          className="preview-btn close-btn" 
          onClick={onClose}
          title="Close Preview"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="preview-content" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={alt} className="preview-image" />
      </div>
    </div>
  );
};

export default ImagePreviewModal;
