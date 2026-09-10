import React, { useState } from 'react'
import {
  User,
  DollarSign,
  Star,
  Sparkles,
  Save,
  Plus,
  X,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export const Profile: React.FC = () => {
  const { user, updateProfileState, role } = useAuth()

  const [name, setName] = useState(user?.name || '')
  const [headline, setHeadline] = useState(
    user?.headline || (role === 'STUDENT' ? 'Student Software Developer' : 'Startup Founder & Project Owner'),
  )
  const [bio, setBio] = useState(
    user?.bio || 'DevCollab community member.',
  )
  const [hourlyRate, setHourlyRate] = useState<number>(user?.hourlyRate || 35)
  const [skills, setSkills] = useState<string[]>(
    user?.skills || (role === 'STUDENT' ? ['React', 'TypeScript', 'Node.js'] : []),
  )
  const [newSkill, setNewSkill] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill('')
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      updateProfileState({
        name,
        headline,
        bio,
        hourlyRate: role === 'STUDENT' ? hourlyRate : undefined,
        skills,
      })
      setSaving(false)
      toast.success('Profile details saved successfully')
    }, 400)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <User className="w-6 h-6 text-brand-400" />
          User Profile & Portfolio
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your public developer profile and skill matrix
        </p>
      </div>

      <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-white/10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-brand-500/25">
            {name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()}
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2.5">
              <h2 className="text-xl font-bold text-white">{name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{user?.email || 'user@devcollab.local'}</p>
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-2 text-xs text-slate-300">
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> {user?.rating || 4.9} Rating
              </span>
              {role === 'STUDENT' && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <DollarSign className="w-3.5 h-3.5" /> ${hourlyRate}/hr
                </span>
              )}
              <span className="flex items-center gap-1 text-sky-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified ID
              </span>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-500 text-xs cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Professional Headline
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Bio & Background
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-all"
            />
          </div>

          {role === 'STUDENT' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hourly Rate ($ USD)
              </label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                min="15"
                max="250"
                className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>
          )}

          {/* Skill Matrix */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Technical Skills (Indexed in Elasticsearch for Instant Matching)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-medium"
                >
                  <Sparkles className="w-3 h-3 text-brand-400" />
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-brand-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                placeholder="Add skill (e.g. Next.js, GraphQL, Redis)"
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-all"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
