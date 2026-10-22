// src/features/clients/components/ClientCredentialsModal.jsx
import { useState } from 'react';
import type { ClientCredentials } from '../clientsSlice';
import { 
  Key, 
  Copy, 
  Check, 
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { Modal, Button, Alert } from '../../../components';

const ClientCredentialsModal = ({ credentials, onClose }: { credentials: ClientCredentials; onClose: () => void }) => {
  const [copiedClientId, setCopiedClientId] = useState(false);
  const [copiedClientKey, setCopiedClientKey] = useState(false);
  const [showClientKey, setShowClientKey] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'clientId') {
        setCopiedClientId(true);
        setTimeout(() => setCopiedClientId(false), 2000);
      } else {
        setCopiedClientKey(true);
        setTimeout(() => setCopiedClientKey(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    const content = `Client Credentials:
=====================
Client ID: ${credentials.clientId}
Client Key: ${credentials.clientKey}

Important Information:
- Store these credentials securely
- The client key cannot be retrieved again
- Keep this information confidential
- Use in your application's configuration`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-credentials-${credentials.clientId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="md"
      title="Client Credentials"
      preventClose={true}
    >
      <div className="space-y-6">
        {/* Warning Alert */}
        <Alert
          type="warning"
          title="Important Security Notice"
          message="Store these credentials securely. The client key will not be shown again."
          showIcon
        />

        {/* Client ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Client ID
          </label>
          <div className="relative">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
              <code className="text-sm font-mono text-gray-900 dark:text-white break-all">
                {credentials.clientId}
              </code>
              <button
                onClick={() => handleCopy(credentials.clientId, 'clientId')}
                className="ml-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
                title="Copy to clipboard"
              >
                {copiedClientId ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Client Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Client Key
            </label>
            <button
              onClick={() => setShowClientKey(!showClientKey)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
            >
              {showClientKey ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Show
                </>
              )}
            </button>
          </div>
          
          <div className="relative">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
              <code className="text-sm font-mono text-gray-900 dark:text-white break-all">
                {showClientKey ? credentials.clientKey : '•'.repeat(32)}
              </code>
              <button
                onClick={() => handleCopy(credentials.clientKey, 'clientKey')}
                className="ml-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
                title="Copy to clipboard"
              >
                {copiedClientKey ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This key will not be shown again. Make sure to copy it now.
          </p>
        </div>

        {/* Download Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <Key className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Recommended Action</p>
                <p>Download these credentials and store them in a secure location. You will need them to configure your application.</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-4">
            <Button
              variant="primary"
              onClick={handleDownload}
              icon={Download}
              className="w-full"
            >
              {downloaded ? 'Downloaded!' : 'Download Credentials'}
            </Button>
          </div>
        </div>

        {/* Final Instructions */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Next Steps:
          </h4>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>Store the credentials in a secure location</li>
            <li>Configure your application with these credentials</li>
            <li>Test the authentication flow</li>
            <li>Contact support if you encounter any issues</li>
          </ol>
        </div>

        {/* Footer */}
        <div className="flex justify-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="primary"
            onClick={onClose}
            className="w-full"
          >
            I've Saved the Credentials
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ClientCredentialsModal;