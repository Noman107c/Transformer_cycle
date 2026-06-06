import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Calendar } from 'lucide-react';
import { Button } from '../ui/button'; // Adjust imports according to your ui setup

interface DateSelectorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDate: (dateStr: string) => void;
  title?: string;
  description?: string;
}

export function DateSelectorModal({
  isOpen,
  onOpenChange,
  onSelectDate,
  title = "Select Date",
  description = "Please select a date to view or edit historical records."
}: DateSelectorModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');

  const handleConfirm = () => {
    if (selectedDate) {
      onSelectDate(selectedDate);
      onOpenChange(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-blue-500/20 bg-[#0a0e27] p-6 shadow-lg duration-200 sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              {title}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {description}
            </Dialog.Description>
          </div>
          
          <div className="py-4">
            <label htmlFor="date-picker" className="block text-sm font-medium text-white mb-2">
              Date (YYYY-MM-DD)
            </label>
            <input
              id="date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-[#121633] border border-blue-500/20 rounded-md px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <button
              onClick={() => onOpenChange(false)}
              className="mt-2 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors border border-blue-500/20 hover:bg-blue-500/10 text-white sm:mt-0"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedDate}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
