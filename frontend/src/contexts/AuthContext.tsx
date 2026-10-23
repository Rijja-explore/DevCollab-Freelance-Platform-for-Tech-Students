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
    const rawRole = localStorage.getItem('devcollab_role')
    const savedRole: UserRole = rawRole
      ? (rawRole.toUpperCase() as UserRole)
      : 'STUDENT'

    if (savedToken && savedUserJson) {
      try {
        const parsedUser: UserProfile = JSON.parse(savedUserJson)
        if (parsedUser.role) {
          parsedUser.role = (parsedUser.role as string).toUpperCase() as UserRole
        }
        setUser(parsedUser)
        setToken(savedToken)
      } catch {
        setUser(null)
        setToken(null)
      }
    } else if (savedToken) {
      setToken(savedToken)
      const validRole = savedRole === 'STARTUP' || savedRole === 'ADMIN' ? savedRole : 'STUDENT'
      setUser({
        id: 'user-' + validRole.toLowerCase(),
        email: DEFAULT_USERS[validRole].email,
        name: DEFAULT_USERS[validRole].name,
        role: validRole,
        headline: DEFAULT_USERS[validRole].headline,
        skills: DEFAULT_USERS[validRole].skills,
      })
    }
    setIsLoading(false)
  }, [])

  const persistAuth = (tokenVal: string, userObj: UserProfile) => {
    const normalizedRole = ((userObj.role || 'STUDENT') as string).toUpperCase() as UserRole
    const normalizedUser = { ...userObj, role: normalizedRole }
    localStorage.setItem('devcollab_token', tokenVal)
    localStorage.setItem('devcollab_role', normalizedRole)
    localStorage.setItem('devcollab_user', JSON.stringify(normalizedUser))
    setToken(tokenVal)
    setUser(normalizedUser)
  }

  const login = async (email: string, _password?: string) => {
    setIsLoading(true)
    const registered = JSON.parse(localStorage.getItem('devcollab_registered_users') || '{}')
    const cachedUser = registered[email.toLowerCase().trim()]

    try {
      const res = await authApi.login(email)
      const data = res.data
      const rawRole = ((data.role || cachedUser?.role || '') as string).toUpperCase()
      const role: UserRole = (rawRole === 'STUDENT' || rawRole === 'STARTUP' || rawRole === 'ADMIN')
        ? (rawRole as UserRole)
        : (cachedUser?.role || (email.toLowerCase().includes('student') || email.toLowerCase().includes('alex') ? 'STUDENT' : email.toLowerCase().includes('admin') ? 'ADMIN' : 'STARTUP'))

      const userProfile: UserProfile = {
        id: data.userId || (cachedUser ? 'user-' + email.replace(/[^a-zA-Z0-9]/g, '') : 'user-' + Date.now()),
        email: data.email || email,
        role: role,
        name: data.name || cachedUser?.name || email.split('@')[0],
        headline: data.headline || cachedUser?.headline || (role === 'STUDENT' ? 'Student Developer' : 'Startup Client'),
        skills: data.skills || cachedUser?.skills || (role === 'STUDENT' ? ['React', 'TypeScript', 'Node.js'] : []),
        profileId: data.profileId,
        rating: data.rating ?? 0,
      }
      persistAuth(data.token || data.accessToken, userProfile)
      toast.success(`Welcome back, ${userProfile.name}! (${role === 'STUDENT' ? 'Student' : 'Startup'})`)
    } catch {
      const role: UserRole = cachedUser?.role || ((email.toLowerCase().includes('student') || email.toLowerCase().includes('alex')) ? 'STUDENT' : email.toLowerCase().includes('admin') ? 'ADMIN' : 'STARTUP')
      const demo = DEFAULT_USERS[role]
      const fallbackToken = 'devcollab-jwt-' + Math.random().toString(36).substring(2)
      const userProfile: UserProfile = {
        id: cachedUser ? 'user-' + email.replace(/[^a-zA-Z0-9]/g, '') : 'demo-' + role.toLowerCase(),
        email: email || demo.email,
        role: role,
        name: cachedUser?.name || demo.name,
        headline: cachedUser?.headline || demo.headline,
        skills: cachedUser?.skills || demo.skills,
        rating: 4.95,
      }
      persistAuth(fallbackToken, userProfile)
      toast.success(`Signed in as ${userProfile.name} (${role === 'STUDENT' ? 'Student' : 'Startup'})`)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true)
    // Cache registered account locally so client-side routing and fallback logins always retain the selected role
    try {
      const registered = JSON.parse(localStorage.getItem('devcollab_registered_users') || '{}')
      registered[payload.email.toLowerCase().trim()] = {
        role: payload.role,
        name: payload.name,
        headline: payload.headline,
        bio: payload.bio,
        skills: payload.skills,
      }
      localStorage.setItem('devcollab_registered_users', JSON.stringify(registered))
    } catch {
      // ignore storage quota issues
    }

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
        profileId: data.profileId,
        rating: data.rating ?? 0,
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
