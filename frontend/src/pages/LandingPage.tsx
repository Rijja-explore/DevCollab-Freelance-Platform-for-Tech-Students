import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  FolderGit2,
  Search,
  CheckCircle2,
  Users,
  CreditCard,
  Terminal,
} from 'lucide-react'
import { useAuth, UserRole } from '../contexts/AuthContext'

export const LandingPage: React.FC = () => {
  const { quickLogin, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleQuickDemo = async (role: UserRole) => {
    await quickLogin(role)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-brand-500 selection:text-white relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-[30rem] h-[30rem] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-sky-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="dot-grid-overlay pointer-events-none" />

      {/* Navigation Header */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white">DevCollab</span>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20 uppercase tracking-wider">
              Microservices
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
          <a href="#workflow" className="hover:text-white transition-colors">How It Works</a>
          <a href="#demo" className="hover:text-white transition-colors">Quick Demo</a>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-brand-500/20"
            >
              Open Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 mb-8 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>PayPal Sandbox Escrow & Live WebSocket Collaboration Ready</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
          The Freelance Platform for{' '}
          <span className="bg-gradient-to-r from-brand-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
            Tech Students & Startups
          </span>
        </h1>

        <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-400 leading-relaxed mb-10">
          Match verified student engineers with ambitious startups using intelligent skill indexing,
          collaborate in real-time workspaces with instant code reviews, and guarantee safe delivery via
          PayPal milestone-based escrow.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 text-white font-bold text-base hover:shadow-xl hover:shadow-brand-500/25 transition-all"
          >
            Start Freelancing Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/projects"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-base hover:bg-white/10 transition-all backdrop-blur-md"
          >
            <Search className="w-5 h-5 text-brand-400" />
            Browse Open Projects
          </Link>
        </div>

        {/* 1-Click Instant Demo Launch Bar */}
        <div id="demo" className="max-w-3xl mx-auto p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Instant 1-Click Demo Logins (No Sign Up Needed)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleQuickDemo('STUDENT')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold text-xs hover:bg-emerald-500/20 transition-all"
            >
              <Users className="w-4 h-4" />
              Demo: Student Dev
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('STARTUP')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 font-semibold text-xs hover:bg-brand-500/20 transition-all"
            >
              <Zap className="w-4 h-4" />
              Demo: Startup Client
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('ADMIN')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold text-xs hover:bg-indigo-500/20 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              Demo: System Admin
            </button>
          </div>
        </div>
      </section>

      {/* Platform Pillars / Feature Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 relative z-10 border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">
            Core Microservices Ecosystem
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">
            Built for Scalability, Security, and Speed
          </h2>
          <p className="text-slate-400 text-sm mt-3">
            Each microservice is autonomous, powered by its own database and event-driven communication.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Discovery */}
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-brand-500/40 transition-all duration-300 group hover:shadow-2xl hover:shadow-brand-500/10">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-6 group-hover:scale-110 transition-transform">
              <Search className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-1">
              Service 1
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Discovery & Matching</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Spring Boot + PostgreSQL + Elasticsearch 8.11 engine with sub-millisecond full-text and skill-vector search, plus GraphQL API.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-400" />
                Elasticsearch BM25 + Skill matching
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-400" />
                Direct /graphql query explorer
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-400" />
                RabbitMQ event publishing
              </li>
            </ul>
          </div>

          {/* Card 2: Workspace */}
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-indigo-500/40 transition-all duration-300 group hover:shadow-2xl hover:shadow-indigo-500/10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">
              Service 2
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Real-Time Workspace</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Node.js + MongoDB + Redis Pub/Sub powered collaboration with live multi-user chat and inline code review threads.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                Socket.io low-latency messaging
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                Line-by-line code reviews & diffs
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                Real-time milestone deliverable tracker
              </li>
            </ul>
          </div>

          {/* Card 3: Escrow */}
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/40 transition-all duration-300 group hover:shadow-2xl hover:shadow-emerald-500/10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
              Service 3
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Escrow & Milestone Vault</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Spring Boot + MySQL 8.0 with official PayPal Sandbox checkout, idempotent webhook processing, and append-only audit logs.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                PayPal Smart Buttons & Instant Capture
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Two-way Milestone Approval Workflow
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Tamper-resistant Transaction Ledger
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section id="architecture" className="max-w-7xl mx-auto px-6 py-20 relative z-10 border-t border-white/10">
        <div className="p-10 rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-[11px] font-bold text-brand-400 uppercase tracking-widest mb-4">
                <Terminal className="w-3.5 h-3.5" />
                Enterprise Security & Protocols
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
                Decoupled RS256 Auth & Asynchronous Event Bus
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                All microservices independently verify RS256 JWT tokens using the public key hosted at <code className="text-brand-300 bg-white/5 px-1.5 py-0.5 rounded text-xs">/.well-known/jwks.json</code>. Inter-service state sync is handled seamlessly via RabbitMQ exchanges.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-lg font-bold text-white">RS256</div>
                  <div className="text-xs text-slate-400">Asymmetric JWT Signature</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-lg font-bold text-white">RabbitMQ</div>
                  <div className="text-xs text-slate-400">Event-Driven Topic Exchange</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-lg font-bold text-white">3 Databases</div>
                  <div className="text-xs text-slate-400">Postgres, Mongo, MySQL</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-lg font-bold text-white">PayPal V2</div>
                  <div className="text-xs text-slate-400">Orders & Webhooks API</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 font-mono text-xs text-slate-300 space-y-3 overflow-x-auto shadow-2xl">
              <div className="flex items-center gap-2 text-slate-500 border-b border-white/10 pb-3">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] text-slate-400 font-sans ml-2">devcollab-microservices-topology.json</span>
              </div>
              <pre className="text-emerald-400">
{`{
  "platform": "DevCollab",
  "auth": {
    "algorithm": "RS256",
    "key_size": 2048,
    "jwks": "/.well-known/jwks.json"
  },
  "services": [
    { "name": "Discovery", "port": 8081, "db": "PostgreSQL + ES 8.11" },
    { "name": "Workspace", "port": 5000, "db": "MongoDB + Redis" },
    { "name": "Escrow",    "port": 8080, "db": "MySQL + PayPal SDK" }
  ],
  "event_bus": "RabbitMQ topic: devcollab.events"
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-10 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div>
          © 2026 DevCollab Platform. Cloud-Native Microservices Architecture.
        </div>
        <div className="flex items-center gap-6">
          <Link to="/projects" className="hover:text-slate-300 transition-colors">Projects</Link>
          <Link to="/workspaces" className="hover:text-slate-300 transition-colors">Workspaces</Link>
          <Link to="/contracts" className="hover:text-slate-300 transition-colors">Escrow</Link>
          <Link to="/graphql-explorer" className="hover:text-slate-300 transition-colors">GraphQL</Link>
        </div>
      </footer>
    </div>
  )
}
