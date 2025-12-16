"use client";

import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'default';
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = 'default'
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg text-gray-900">{title}</h3>
                    </div>

                    <p className="text-gray-600 text-sm mb-6 ml-14 -mt-2">
                        {description}
                    </p>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors ${variant === 'danger'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-primary hover:bg-primary/90'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
