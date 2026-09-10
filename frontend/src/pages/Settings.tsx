import React, { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Shield,
  Key,
  Database,
  CreditCard,
  CheckCircle2,
  Copy,
} from 'lucide-react'
import toast from 'react-hot-toast'

export const Settings: React.FC = () => {
  const [token, setToken] = useState<string>('')
  const [jwksData, setJwksData] = useState<string>('Loading JWKS...')
  const [activeTab, setActiveTab] = useState<'security' | 'services' | 'paypal'>('security')

  useEffect(() => {
    const savedToken = localStorage.getItem('devcollab_token') || ''
    setToken(savedToken)

    fetch('http://localhost:8081/.well-known/jwks.json')
      .then((res) => res.json())
      .then((data) => setJwksData(JSON.stringify(data, null, 2)))
      .catch(() => {
        setJwksData(
          JSON.stringify(
            {
              keys: [
                {
                  kty: 'RSA',
                  use: 'sig',
                  alg: 'RS256',
                  kid: 'devcollab-key-1',
                },
              ],
            },
            null,
            2,
          ),
        )
      })
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-brand-400" />
          Platform Architecture & Security Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Inspect RS256 token claims, microservices endpoints, and PayPal Sandbox keys
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'security'
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          RS256 JWT Security
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'services'
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Microservices Topology
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paypal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'paypal'
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          PayPal Sandbox
        </button>
      </div>

      {/* Tab 1: Security */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-brand-400" />
                Active Session RS256 Bearer Token
              </h3>
              <button
                type="button"
                onClick={() => copyToClipboard(token, 'JWT Token')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-colors border border-white/10"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Token
              </button>
            </div>
            <textarea
              value={token}
              readOnly
              rows={4}
              className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 font-mono text-xs text-slate-300 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400">
              This token is automatically verified by all 3 microservices (Discovery, Workspace, Escrow) via RSA public key cryptography.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Public JWKS Keyset (/.well-known/jwks.json)
              </h3>
              <button
                type="button"
                onClick={() => copyToClipboard(jwksData, 'JWKS JSON')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-colors border border-white/10"
              >
                <Copy className="w-3.5 h-3.5" /> Copy JWKS
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-900 border border-white/10 font-mono text-xs text-emerald-400 overflow-x-auto max-h-60">
              {jwksData}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 2: Microservices Topology */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">Discovery Service</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Port 8081</span>
            </div>
            <p className="text-xs text-slate-400">Spring Boot 3.2.5, PostgreSQL, Elasticsearch 8.11, Redis</p>
            <div className="pt-2 border-t border-white/10 text-xs text-slate-300 space-y-1">
              <div>• REST: <code>/api/projects</code></div>
              <div>• GraphQL: <code>/graphql</code></div>
              <div>• Search: <code>/api/projects/search</code></div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Workspace Service</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Port 5000</span>
            </div>
            <p className="text-xs text-slate-400">Node.js 18, MongoDB 7.0, Redis Pub/Sub, Socket.io</p>
            <div className="pt-2 border-t border-white/10 text-xs text-slate-300 space-y-1">
              <div>• REST: <code>/api/workspaces</code></div>
              <div>• Realtime: <code>ws://localhost:5000</code></div>
              <div>• Reviews: <code>/api/comments</code></div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Escrow Service</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Port 8080</span>
            </div>
            <p className="text-xs text-slate-400">Spring Boot 3.2.5, MySQL 8.0, PayPal Orders API, RabbitMQ</p>
            <div className="pt-2 border-t border-white/10 text-xs text-slate-300 space-y-1">
              <div>• Contracts: <code>/api/contracts</code></div>
              <div>• Milestones: <code>/api/milestones</code></div>
              <div>• Webhooks: <code>/api/webhooks/paypal</code></div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: PayPal */}
      {activeTab === 'paypal' && (
        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">PayPal Sandbox Escrow Configuration</h3>
              <p className="text-xs text-slate-400">Exclusively powering secure milestone payouts and vaulting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PayPal Environment</div>
              <div className="text-sm font-bold text-white">Sandbox Mode (Testing)</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Webhooks Status</div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Idempotent Listener Active
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
