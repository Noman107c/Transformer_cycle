'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Transformer {
  _id: string;
  name: string;
  location: string;
  type: string;
  capacity: number;
  status: 'CRITICAL' | 'WARNING' | 'MONITOR' | 'GOOD';
  healthIndex: number;
  predictedHI: number;
  rul: number;
  ambientTemperatureC: number;
  ageYr: number;
  currentA: number;
  voltageKV: number;
  maintenanceCount: number;
  noOfShortCircuits: number;
}

interface EditTransformerModalProps {
  transformer: Transformer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Transformer>) => Promise<void>;
}

export function EditTransformerModal({
  transformer,
  isOpen,
  onClose,
  onSave,
}: EditTransformerModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Transformer>>({});

  useEffect(() => {
    if (transformer) {
      setFormData(transformer);
    }
  }, [transformer]);

  const handleInputChange = (field: keyof Transformer, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!transformer) return;
    setIsLoading(true);
    try {
      await onSave(transformer._id, formData);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Transformer</DialogTitle>
          <DialogDescription className="text-gray-400">
            Update transformer information and operational parameters
          </DialogDescription>
        </DialogHeader>

        {transformer && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name" className="text-gray-300">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., TX-001"
                />
              </div>

              <div>
                <Label htmlFor="location" className="text-gray-300">
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="e.g., North Substation"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type" className="text-gray-300">
                    Type
                  </Label>
                  <Select value={formData.type || ''} onValueChange={(val) => handleInputChange('type', val)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="Step-Down">Step-Down</SelectItem>
                      <SelectItem value="Distribution">Distribution</SelectItem>
                      <SelectItem value="Step-Up">Step-Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="capacity" className="text-gray-300">
                    Capacity (kVA)
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity || ''}
                    onChange={(e) => handleInputChange('capacity', parseFloat(e.target.value))}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Health & Status */}
            <div className="border-t border-gray-700 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Health & Status</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status" className="text-gray-300">
                      Status
                    </Label>
                    <Select value={formData.status || 'GOOD'} onValueChange={(val) => handleInputChange('status', val)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                        <SelectItem value="WARNING">WARNING</SelectItem>
                        <SelectItem value="MONITOR">MONITOR</SelectItem>
                        <SelectItem value="GOOD">GOOD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="healthIndex" className="text-gray-300">
                      Health Index
                    </Label>
                    <Input
                      id="healthIndex"
                      type="number"
                      step="0.001"
                      min="0"
                      max="1"
                      value={formData.healthIndex || ''}
                      onChange={(e) => handleInputChange('healthIndex', parseFloat(e.target.value))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rul" className="text-gray-300">
                      RUL (years)
                    </Label>
                    <Input
                      id="rul"
                      type="number"
                      step="0.1"
                      value={formData.rul || ''}
                      onChange={(e) => handleInputChange('rul', parseFloat(e.target.value))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ageYr" className="text-gray-300">
                      Age (years)
                    </Label>
                    <Input
                      id="ageYr"
                      type="number"
                      step="0.1"
                      value={formData.ageYr || ''}
                      onChange={(e) => handleInputChange('ageYr', parseFloat(e.target.value))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Parameters */}
            <div className="border-t border-gray-700 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Operational Parameters</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="temperature" className="text-gray-300">
                      Temp (°C)
                    </Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      value={formData.ambientTemperatureC || ''}
                      onChange={(e) => handleInputChange('ambientTemperatureC', parseFloat(e.target.value))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="current" className="text-gray-300">
                      Current (A)
                    </Label>
                    <Input
                      id="current"
                      type="number"
                      step="0.1"
                      value={formData.currentA || ''}
                      onChange={(e) => handleInputChange('currentA', parseFloat(e.target.value))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="voltage" className="text-gray-300">
                      Voltage (kV)
                    </Label>
                    <Input
                      id="voltage"
                      type="number"
                      step="0.01"
                      value={formData.voltageKV || ''}
                      onChange={(e) => handleInputChange('voltageKV', parseFloat(e.target.value))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maintenance" className="text-gray-300">
                      Maintenance Count
                    </Label>
                    <Input
                      id="maintenance"
                      type="number"
                      value={formData.maintenanceCount || ''}
                      onChange={(e) => handleInputChange('maintenanceCount', parseInt(e.target.value))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-700 flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="bg-gray-800 text-gray-200 hover:bg-gray-700 border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
