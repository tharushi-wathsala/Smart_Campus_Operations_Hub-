import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import './PromptModal.css';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  required?: boolean;
}

const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  title,
  message,
  placeholder = 'Type here...',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  defaultValue = '',
  onConfirm,
  onCancel,
  required = false
}) => {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setError(null);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (required && !value.trim()) {
      setError('This field is required');
      return;
    }
    onConfirm(value.trim());
  };

  return (
    <div className="prompt-modal-overlay">
      <div className="prompt-modal-content">
        <div className="prompt-modal-header">
          <div className="prompt-title-group">
            <div className="prompt-icon-ring">
              <AlertCircle size={20} className="prompt-icon" />
            </div>
            <h2>{title}</h2>
          </div>
          <button onClick={onCancel} className="prompt-close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="prompt-modal-body">
          <p className="prompt-message">{message}</p>
          
          <div className="prompt-input-wrapper">
            <textarea
              className={`prompt-textarea ${error ? 'has-error' : ''}`}
              placeholder={placeholder}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
            />
            {error && <span className="prompt-error-msg">{error}</span>}
          </div>

          <div className="prompt-modal-footer">
            <button type="button" onClick={onCancel} className="prompt-btn-secondary">
              {cancelLabel}
            </button>
            <button type="submit" className="prompt-btn-primary">
              <Check size={18} style={{ marginRight: '0.5rem' }} />
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromptModal;
