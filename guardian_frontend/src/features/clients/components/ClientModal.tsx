// src/features/clients/components/ClientModal.jsx
import { useState, type FormEvent } from 'react';
import type { Client } from '../../../types';
import type { ClientCredentials, ClientInput } from '../clientsSlice';
import { useAppDispatch } from '../../../app/hooks';
import { registerClient, updateClient } from '../clientsSlice';
import { X, Plus, Globe, Clock, AlertCircle } from 'lucide-react';
import { Modal, Button } from '../../../components';

const ClientModal = ({ mode = 'create', client = null, onClose, onSuccess }: { mode?: 'create' | 'edit'; client?: Client | null; onClose: () => void; onSuccess: (credentials?: ClientCredentials) => void }) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formData, setFormData] = useState({
    name: client?.name || '',
    description: client?.description || '',
    allowedOrigins: client?.allowedOrigins?.length ? client.allowedOrigins : [''],
    idleTimeout: client?.idleTimeout || 30,
    email: client?.email || '', // For client admin email
  });

  const validateForm = () => {
    const newErrors: Record<string, string | null> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Client name must be at least 3 characters';
    }

    if (!formData.email.trim() && mode === 'create') {
      newErrors.email = 'Admin email is required';
    } else if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.allowedOrigins.some(origin => !origin.trim())) {
      newErrors.allowedOrigins = 'All origins must be valid URLs';
    } else {
      formData.allowedOrigins.forEach((origin, index) => {
        if (origin && !isValidUrl(origin)) {
          newErrors[`origin${index}`] = 'Invalid URL format';
        }
      });
    }

    if (formData.idleTimeout < 1 || formData.idleTimeout > 1440) {
      newErrors.idleTimeout = 'Idle timeout must be between 1 and 1440 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const data: ClientInput = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        allowedOrigins: formData.allowedOrigins.filter(origin => origin.trim()),
        idleTimeout: formData.idleTimeout,
        ...(mode === 'create' && { email: formData.email.trim() }),
      };

      if (mode === 'create') {
        const result = await dispatch(registerClient(data)).unwrap();
        onSuccess(result);
      } else if (client) {
        await dispatch(updateClient({ id: client.id, data })).unwrap();
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to save client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOriginChange = (index: number, value: string) => {
    const newOrigins = [...formData.allowedOrigins];
    newOrigins[index] = value;
    setFormData({ ...formData, allowedOrigins: newOrigins });
    if (errors.allowedOrigins) {
      setErrors({ ...errors, allowedOrigins: null });
    }
  };

  const addOrigin = () => {
    setFormData({
      ...formData,
      allowedOrigins: [...formData.allowedOrigins, ''],
    });
  };

  const removeOrigin = (index: number) => {
    if (formData.allowedOrigins.length > 1) {
      const newOrigins = formData.allowedOrigins.filter((_, i) => i !== index);
      setFormData({ ...formData, allowedOrigins: newOrigins });
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="lg"
      title={`${mode === 'create' ? 'Register New' : 'Edit'} Client`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Client Information
          </h3>
          
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Client Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                errors.name
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 dark:bg-gray-800'
              }`}
              placeholder="Enter client application name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Email (Create only) */}
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                  errors.email
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 dark:bg-gray-800'
                }`}
                placeholder="admin@client.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Brief description of the client application"
            />
          </div>
        </div>

        {/* Allowed Origins */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Allowed Origins
            </h3>
            <button
              type="button"
              onClick={addOrigin}
              className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Origin
            </button>
          </div>

          <div className="space-y-3">
            {formData.allowedOrigins.map((origin, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => handleOriginChange(index, e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                        errors[`origin${index}`] || errors.allowedOrigins
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-gray-300 dark:border-gray-600 dark:bg-gray-800'
                      }`}
                      placeholder="https://example.com"
                    />
                  </div>
                  {errors[`origin${index}`] && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors[`origin${index}`]}
                    </p>
                  )}
                </div>
                {formData.allowedOrigins.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOrigin(index)}
                    className="p-2.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {errors.allowedOrigins && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.allowedOrigins}</p>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Allowed Origins Information</p>
                <p>Enter the URLs where your application will be hosted. For local development, use <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">http://localhost:3000</code></p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeout Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Session Settings
          </h3>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Idle Timeout (minutes)
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formData.idleTimeout} min
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Clock className="w-5 h-5 text-gray-400" />
              <input
                type="range"
                min="1"
                max="1440"
                step="1"
                value={formData.idleTimeout}
                onChange={(e) => handleChange('idleTimeout', parseInt(e.target.value))}
                className="flex-1"
              />
            </div>
            
            {errors.idleTimeout && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.idleTimeout}</p>
            )}
            
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>1 min</span>
              <span>24 hours</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            {mode === 'create' ? 'Register Client' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ClientModal;