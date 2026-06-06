import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isLoading?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  isLoading = false
}: ConfirmDeleteModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-red-500/20 bg-[#0a0e27] p-6 shadow-lg duration-200 sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {title}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-red-200/80 mt-2">
              {description}
            </Dialog.Description>
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
            <button
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="mt-2 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors border border-blue-500/20 hover:bg-blue-500/10 text-white sm:mt-0 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
