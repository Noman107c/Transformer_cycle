'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface DeleteTransformerModalProps {
  transformerId: string;
  transformerName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteTransformerModal({
  transformerId,
  transformerName,
  isOpen,
  onClose,
  onConfirm,
}: DeleteTransformerModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onConfirm(transformerId);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-gray-900 border-gray-700">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-white">Delete Transformer</AlertDialogTitle>
          </div>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-gray-300">
          Are you sure you want to delete <span className="font-semibold text-white">{transformerName}</span>?
          This action cannot be undone. All associated sensor readings and alerts will also be removed.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-800 text-gray-200 hover:bg-gray-700 border-gray-600">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
