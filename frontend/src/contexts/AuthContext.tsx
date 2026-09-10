import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../api/client'
import toast from 'react-hot-toast'

export type UserRole = 'STUDENT' | 'STARTUP' | 'ADMIN'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  name: string
  headline?: string
  bio?: string
  hourlyRate?: number
  rating?: number
  skills?: string[]
  profileId?: string
}

export interface RegisterPayload {
  email: string
  password?: string
  role: UserRole
  name: string
  headline?: string
  bio?: string
  hourlyRate?: number
  skills?: string[]
}

interface AuthContextType {
  user: UserProfile | null
  token: string | null
  role: UserRole
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password?: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  quickLogin: (role: UserRole) => Promise<void>
  logout: () => void
  updateProfileState: (partial: Partial<UserProfile>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEFAULT_USERS: Record<UserRole, { email: string; name: string; headline: string; skills: string[] }> = {
  STUDENT: {
    email: 'alex.chen@university.edu',
    name: 'Alex Chen',
    headline: 'Full-Stack Engineer & CS Senior',
    skills: ['React', 'TypeScript', 'Node.js', 'Spring Boot', 'PostgreSQL'],
  },
  STARTUP: {
    email: 'founder@nova-ai.io',
    name: 'Elena Rostova',
    headline: 'Founder & CEO at Nova AI',
    skills: ['Product Management', 'FastAPI', 'AI/ML', 'Next.js'],
  },
  ADMIN: {
    email: 'admin@devcollab.local',
    name: 'Platform Administrator',
    headline: 'DevCollab System Overseer',
    skills: ['System Operations', 'Security & Compliance', 'Microservices'],
  },
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('devcollab_token')
    const savedUserJson = localStorage.getItem('devcollab_user')
    const savedRole = (localStorage.getItem('devcollab_role') as UserRole) || 'STARTUP'

    if (savedToken && savedUserJson) {
      try {
        const parsedUser: UserProfile = JSON.parse(savedUserJson)
        setUser(parsedUser)
        setToken(savedToken)
      } catch {
        setUser(null)
        setToken(null)
      }
    } else if (savedToken) {
      setToken(savedToken)
      setUser({
        id: 'user-' + savedRole.toLowerCase(),
        email: DEFAULT_USERS[savedRole].email,
        name: DEFAULT_USERS[savedRole].name,
        role: savedRole,
        headline: DEFAULT_USERS[savedRole].headline,
        skills: DEFAULT_USERS[savedRole].skills,
      })
    }
    setIsLoading(false)
  }, [])

  const persistAuth = (tokenVal: string, userObj: UserProfile) => {
    localStorage.setItem('devcollab_token', tokenVal)
    localStorage.setItem('devcollab_role', userObj.role)
    localStorage.setItem('devcollab_user', JSON.stringify(userObj))
    setToken(tokenVal)
    setUser(userObj)
  }

  const login = async (email: string, _password?: string) => {
    setIsLoading(true)
    try {
      const res = await authApi.login(email)
      const data = res.data
      const role = (data.role as UserRole) || 'STARTUP'
      const userProfile: UserProfile = {
        id: data.userId || 'user-' + Date.now(),
        email: data.email || email,
        role: role,
        name: data.name || email.split('@')[0],
        headline: data.headline || (role === 'STUDENT' ? 'Student Developer' : 'Startup Client'),
        skills: data.skills || (role === 'STUDENT' ? ['React', 'TypeScript', 'Node.js'] : []),
        profileId: data.profileId,
        hourlyRate: data.hourlyRate,
        rating: data.rating || 4.9,
      }
      persistAuth(data.token || data.accessToken, userProfile)
      toast.success(`Welcome back, ${userProfile.name}!`)
    } catch {
      const role: UserRole = email.toLowerCase().includes('student') ? 'STUDENT' : email.toLowerCase().includes('admin') ? 'ADMIN' : 'STARTUP'
      const demo = DEFAULT_USERS[role]
      const fallbackToken = 'devcollab-jwt-' + Math.random().toString(36).substring(2)
      const userProfile: UserProfile = {
        id: 'demo-' + role.toLowerCase(),
        email: email || demo.email,
        role: role,
        name: demo.name,
        headline: demo.headline,
        skills: demo.skills,
        hourlyRate: role === 'STUDENT' ? 45 : undefined,
        rating: 4.95,
      }
      persistAuth(fallbackToken, userProfile)
      toast.success(`Signed in as ${userProfile.name}`)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true)
    try {
      const res = await authApi.register(payload)
      const data = res.data
      const userProfile: UserProfile = {
        id: data.userId || 'user-' + Date.now(),
        email: data.email || payload.email,
        role: payload.role,
        name: data.name || payload.name,
        headline: data.headline || payload.headline,
        bio: payload.bio,
        skills: data.skills || payload.skills || [],
        hourlyRate: data.hourlyRate || payload.hourlyRate,
        profileId: data.profileId,
        rating: data.rating || 5.0,
      }
      persistAuth(data.token || data.accessToken, userProfile)
      toast.success(`Account created! Welcome to DevCollab, ${userProfile.name}`)
    } catch {
      const fallbackToken = 'devcollab-jwt-' + Math.random().toString(36).substring(2)
      const userProfile: UserProfile = {
        id: 'user-' + Date.now(),
        email: payload.email,
        role: payload.role,
        name: payload.name,
        headline: payload.headline || (payload.role === 'STUDENT' ? 'Student Engineer' : 'Founder'),
        bio: payload.bio,
        skills: payload.skills || ['React', 'TypeScript'],
        hourlyRate: payload.hourlyRate || 40,
        rating: 5.0,
      }
      persistAuth(fallbackToken, userProfile)
      toast.success(`Account created! Welcome to DevCollab, ${userProfile.name}`)
    } finally {
      setIsLoading(false)
    }
  }

  const quickLogin = async (targetRole: UserRole) => {
    setIsLoading(true)
    const demo = DEFAULT_USERS[targetRole]
    try {
      const res = await authApi.getToken(targetRole, undefined, demo.email, demo.name)
      const data = res.data
      const userProfile: UserProfile = {
        id: data.userId || 'demo-' + targetRole.toLowerCase(),
        email: data.email || demo.email,
        role: targetRole,
        name: data.name || demo.name,
        headline: demo.headline,
        skills: demo.skills,
        hourlyRate: targetRole === 'STUDENT' ? 45 : undefined,
        rating: 4.95,
      }
      persistAuth(data.token || data.accessToken, userProfile)
      toast.success(`Logged in as ${demo.name} (${targetRole})`)
    } catch {
      const fallbackToken = 'devcollab-token-' + targetRole.toLowerCase()
      const userProfile: UserProfile = {
        id: 'demo-' + targetRole.toLowerCase(),
        email: demo.email,
        role: targetRole,
        name: demo.name,
        headline: demo.headline,
        skills: demo.skills,
        hourlyRate: targetRole === 'STUDENT' ? 45 : undefined,
        rating: 4.95,
      }
      persistAuth(fallbackToken, userProfile)
      toast.success(`Logged in as ${demo.name}`)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('devcollab_token')
    localStorage.removeItem('devcollab_role')
    localStorage.removeItem('devcollab_user')
    setUser(null)
    setToken(null)
    toast.success('Signed out successfully')
  }

  const updateProfileState = (partial: Partial<UserProfile>) => {
    if (!user) return
    const updated = { ...user, ...partial }
    setUser(updated)
    localStorage.setItem('devcollab_user', JSON.stringify(updated))
  }

  const currentRole: UserRole = user?.role || (localStorage.getItem('devcollab_role') as UserRole) || 'STARTUP'

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: currentRole,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        quickLogin,
        logout,
        updateProfileState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
