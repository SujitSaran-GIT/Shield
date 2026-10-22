// src/features/clients/components/ClientIntegrationGuide.jsx
import { useState } from 'react';

import { 
  Code, 
  Terminal,
  Globe,
  Shield,
  Key,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { Button, Badge } from '../../../components';

const ClientIntegrationGuide = ({ clientId, clientName }: { clientId: string; clientName: string }) => {
  const [activeTab, setActiveTab] = useState<'frontend' | 'backend' | 'security'>('frontend');
  const [copyError, setCopyError] = useState('');
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  const tabs = [
    { id: 'frontend', label: 'Frontend', icon: Globe },
    { id: 'backend', label: 'Backend', icon: Terminal },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const codeSamples = {
    frontend: {
      title: 'React/JavaScript Integration',
      language: 'javascript',
      code: `// Browser: call your own same-origin application server.
// /session/login is a route YOU implement in that server.
// It stores Shield tokens in a protected server-side session and sets
// a Secure, HttpOnly, SameSite application session cookie.
// Do not send the client key to browser code.
async function login(email, password) {
  const response = await fetch('/session/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error('Sign-in failed');
  return response.json(); // Return a safe user profile, never tokens.
}`
    },
    backend: {
      title: 'Node.js/Express Integration',
      language: 'javascript',
      code: `// Application server only. Requires Node.js with built-in fetch.
// Configure SHIELD_API_URL to your Shield deployment's /api base URL.
// Inject CLIENT_ID and CLIENT_KEY from your secret manager.
// This is the credential exchange; you implement session persistence,
// login CSRF protection, session expiry, refresh rotation, and logout.
export async function authenticateUser(email, password) {
  const response = await fetch(process.env.SHIELD_API_URL + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password,
      clientId: process.env.CLIENT_ID,
      clientKey: process.env.CLIENT_KEY
    })
  });
  if (!response.ok) throw new Error('Invalid credentials');
  // Keep accessToken and refreshToken exclusively in a protected
  // server-side session. Never log this response or forward tokens.
  return response.json();
}
// Refresh: POST /auth/refresh with { refreshToken, clientId }.
// Replace BOTH saved tokens atomically after every successful refresh.
// Current profile: GET /auth/me with Authorization: Bearer <accessToken>.
// Logout: POST /auth/logout with Authorization: Bearer <accessToken>.
// Always clear your application's local session when signing out.`
    },
    security: {
      title: 'Security Best Practices',
      language: 'markdown',
      code: `# Security Guidelines for ${clientName}

## 1. Token Storage
- **DO NOT** store tokens in localStorage for production apps
- Use HTTP-only cookies for web applications
- Use secure storage mechanisms for mobile/native apps

## 2. Environment Variables
- Store client credentials in environment variables
- Never commit credentials to version control
- Use secret management services in production

## 3. HTTPS Enforcement
- Always use HTTPS in production
- Enable HSTS headers
- Use secure cookies with SameSite and Secure flags

## 4. Rate Limiting
- Implement client-side rate limiting
- Handle 429 (Too Many Requests) responses gracefully
- Implement exponential backoff for retries

## 5. Error Handling
- Never expose sensitive error details to users
- Log errors securely on the server side
- Implement proper error boundaries

## 6. Session Management
- Implement automatic token refresh
- Handle token expiration gracefully
- Provide logout functionality that invalidates tokens

## 7. CORS Configuration
- Configure allowed origins precisely
- Use wildcards (*) only in development
- Validate origin headers on the server side

## 8. Monitoring
- Monitor authentication failures
- Set up alerts for suspicious activities
- Log all authentication events`
    }
  };

  const handleCopy = async (code: string, section: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyError('');
      setCopied((current) => ({ ...current, [section]: true }));
      window.setTimeout(() => setCopied((current) => ({ ...current, [section]: false })), 2000);
    } catch { setCopyError('Copy failed. Select and copy the code manually.'); }
  };

  const handleDownload = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {copyError && <p role="alert" className="form-error">{copyError}</p>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Integration Guide
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Step-by-step instructions to integrate {clientName} with Guardian
          </p>
        </div>
        <Badge variant="primary">
          Client ID: {clientId}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as keyof typeof codeSamples)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Code Sample */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Code className="w-5 h-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {codeSamples[activeTab].title}
              </h3>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(codeSamples[activeTab].code, activeTab)}
                icon={copied[activeTab] ? Check : Copy}
              >
                {copied[activeTab] ? 'Copied!' : 'Copy Code'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(codeSamples[activeTab].code, `${clientId}-${activeTab}-integration.txt`)}
                icon={Download}
              >
                Download
              </Button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre className="text-gray-300 text-sm">
              <code>{codeSamples[activeTab].code}</code>
            </pre>
          </div>
        </div>

        {/* Quick Start Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start">
              <Key className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3">
                  Quick Start
                </h4>
                <ol className="text-blue-700 dark:text-blue-400 space-y-2 list-decimal list-inside">
                  <li>Store your client credentials securely</li>
                  <li>Implement the login flow in your frontend</li>
                  <li>Add token validation to your backend</li>
                  <li>Test the integration in development</li>
                  <li>Deploy to production with proper security</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-start">
              <Shield className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-3">
                  Security Checklist
                </h4>
                <ul className="text-green-700 dark:text-green-400 space-y-2">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Use HTTPS in production
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Store tokens securely
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Implement rate limiting
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Validate all inputs
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            API Endpoints
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Endpoint
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-4 py-3">
                    <Badge variant="success">POST</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    /api/auth/login
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    Authenticate user and get tokens
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <Badge variant="success">POST</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    /api/auth/refresh
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    Refresh expired access token
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <Badge variant="primary">GET</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    /api/auth/me
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    Get current user information
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <Badge variant="error">POST</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    /api/auth/logout
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    Invalidate current session
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </div>
  );
};

export default ClientIntegrationGuide;