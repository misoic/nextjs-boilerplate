import React from 'react';

interface ModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    type?: 'confirm' | 'alert';
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
}

export default function Modal({
    isOpen,
    title,
    message,
    type = 'alert',
    onConfirm,
    onCancel,
    confirmText = '확인',
    cancelText = '취소'
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={type === 'alert' ? onConfirm : onCancel}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                {title && (
                    <h3 className="text-xl font-bold text-white mb-3">
                        {title}
                    </h3>
                )}

                <p className="text-gray-300 mb-6 whitespace-pre-wrap leading-relaxed">
                    {message}
                </p>

                <div className="flex items-center justify-end gap-3">
                    {type === 'confirm' && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium"
                        >
                            {cancelText}
                        </button>
                    )}

                    <button
                        onClick={onConfirm}
                        className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-bold transition-colors text-sm"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
