import React, { useEffect, useState } from 'react'
import {
  FolderGit2,
  CheckCircle,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Compass,
  FileText,
  Search,
  Handshake,
  Users,
} from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { discoveryApi, workspaceApi, contractsApi, transactionsApi, auditApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

export const Dashboard: React.FC = () => {
  const { user, role } = useAuth()
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeWorkspaces: 0,
    totalContracts: 0,
    totalTransactions: 0,
  })
  const [loading, setLoading] = useState(true)
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [recentProjects, setRecentProjects] = useState<any[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const [projRes, wsRes, contractsRes, txRes] = await Promise.allSettled([
          discoveryApi.getProjects(),
          workspaceApi.getAll(),
          contractsApi.getAll(0, 10),
          transactionsApi.getAll(0, 10),
        ])

        const projData = projRes.status === 'fulfilled' ? (projRes.value.data?.data ?? projRes.value.data ?? []) : []
        const wsData = wsRes.status === 'fulfilled' ? (wsRes.value.data?.data ?? wsRes.value.data ?? []) : []
        const contractsData = contractsRes.status === 'fulfilled' ? (contractsRes.value.data?.data?.content ?? contractsRes.value.data?.content ?? []) : []
        const txData = txRes.status === 'fulfilled' ? (txRes.value.data?.data?.content ?? txRes.value.data?.content ?? []) : []

        setStats({
          totalProjects: Array.isArray(projData) ? projData.length : 0,
          activeWorkspaces: Array.isArray(wsData) ? wsData.length : 0,
          totalContracts: Array.isArray(contractsData) ? contractsData.length : 0,
          totalTransactions: Array.isArray(txData) ? txData.length : 0,
        })

        if (Array.isArray(projData)) {
          setRecentProjects(projData.slice(0, 4))
        }

        if (role === 'ADMIN') {
          try {
            const auditRes = await auditApi.getAll(0, 5)
            setRecentLogs(auditRes.data?.data?.content ?? auditRes.data?.content ?? [])
          } catch {
            setRecentLogs([])
          }
        }
      } catch (err) {
        console.error('Failed to load metrics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [role])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-brand-900/30 via-indigo-900/20 to-slate-900 border border-brand-500/20 relative overflow-hidden backdrop-blur-xl">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>Active Role: <strong className="text-white">{role}</strong></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name || 'DevCollab Member'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            {role === 'STUDENT' && 'Explore open freelance projects, collaborate in real-time workspaces, and earn through secured PayPal milestone payouts.'}
            {role === 'STARTUP' && 'Post freelance projects, discover top university student talent with AI match scoring, and manage milestone escrow payments.'}
            {role === 'ADMIN' && 'Full system telemetry: Monitor microservices health, audit trails, and manage contracts across the DevCollab platform.'}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 relative z-10">
          {role === 'STUDENT' && (
            <>
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20"
              >
                <Search className="w-4 h-4" /> Discover Projects
              </Link>
              <Link
                to="/applications"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-all"
              >
                <Handshake className="w-4 h-4 text-emerald-400" /> My Applications
              </Link>
              <Link
                to="/workspaces"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-all"
              >
                <FolderGit2 className="w-4 h-4 text-indigo-400" /> My Collaborations
              </Link>
            </>
          )}

          {role === 'STARTUP' && (
            <>
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20"
              >
                <Search className="w-4 h-4" /> My Projects
              </Link>
              <Link
                to="/talent"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-all"
              >
                <Users className="w-4 h-4 text-brand-400" /> Find Student Talent
              </Link>
              <Link
                to="/applicants"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-all"
              >
                <Handshake className="w-4 h-4 text-emerald-400" /> Review Applicants
              </Link>
              <Link
                to="/milestones"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-all"
              >
                <DollarSign className="w-4 h-4 text-amber-400" /> Milestone Checkout
              </Link>
            </>
          )}

          {role === 'ADMIN' && (
            <>
              <Link
                to="/audit-logs"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
              >
                <ShieldCheck className="w-4 h-4" /> View Security Audit Trail
              </Link>
              <Link
                to="/settings"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-all"
              >
                System Architecture
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Projects in Database"
          value={stats.totalProjects}
          description="Postgres & Elasticsearch indexed"
          icon={Compass}
          loading={loading}
          accent="teal"
        />
        <StatCard
          title="Active Workspaces"
          value={stats.activeWorkspaces}
          description="Socket.io live channels"
          icon={FolderGit2}
          loading={loading}
          accent="violet"
        />
        <StatCard
          title="Escrow Contracts"
          value={stats.totalContracts}
          description="Secured agreements in MySQL"
          icon={FileText}
          loading={loading}
          accent="coral"
        />
        <StatCard
          title="Transactions Ledger"
          value={stats.totalTransactions}
          description="PayPal Sandbox settlements"
          icon={DollarSign}
          loading={loading}
          accent="amber"
        />
      </div>

      {/* Real Recent Projects & Quick Action Panes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Projects */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-brand-400" />
                Live Project Catalog
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Fetched from Service 1 (Postgres & ES 8.11)</p>
            </div>
            <Link to="/projects" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-400">No projects currently posted in the database.</p>
              {role !== 'STUDENT' && (
                <Link to="/projects" className="inline-block mt-3 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold">
                  Post First Project
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/[0.07] border border-white/5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-500/10 text-brand-400 border border-brand-500/20">
                        {p.category}
                      </span>
                      <h3 className="text-xs font-bold text-white">{p.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(p.requiredSkills || []).slice(0, 4).map((s: string) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-300 border border-white/5">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <span className="text-xs font-bold text-emerald-400">${p.budget || 0} USD</span>
                    <Link
                      to={`/projects/${p.id}`}
                      className="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 text-xs font-semibold border border-brand-500/20 flex items-center gap-1"
                    >
                      Details <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Role Insights / Admin Audit */}
        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="pb-3 border-b border-white/10">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              {role === 'ADMIN' ? 'Security Audit Activity' : 'Ecosystem Overview'}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {role === 'ADMIN' ? 'Immutable append-only ledger' : 'Microservices connected via RabbitMQ'}
            </p>
          </div>

          {role === 'ADMIN' && recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map((log, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold text-brand-300">{log.action}</span>
                    <span>{log.createdAt ? format(new Date(log.createdAt), 'MMM dd, HH:mm') : 'Recent'}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] truncate">{log.details || log.entityType}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service 1: Discovery</div>
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Spring Boot + Postgres + ES (Port 8081)
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service 2: Workspace</div>
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Node.js 18 + MongoDB + WebSockets (Port 5000)
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service 3: Escrow</div>
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Spring Boot + MySQL + PayPal Sandbox (Port 8080)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
