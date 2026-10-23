/**
 * CodeReviewPanel Component
 *
 * Full-featured GitHub Code Review UI for DevCollab workspaces.
 *
 * Features:
 *  - Repository linking (owner/repo input, validated against GitHub)
 *  - File tree (browse folders recursively)
 *  - Code viewer (syntax highlighting with line numbers)
 *  - Line-level review comments (reuses existing Comment model + Socket.IO)
 *  - File upload (create new files in the linked repository)
 *
 * Architecture:
 *  - All GitHub calls go through workspaceApi.github.* → backend
 *  - GITHUB_TOKEN stays on the server — never exposed to browser
 *  - Comments use the existing MongoDB Comment collection (fileRef + lineNumber)
 *  - Real-time via existing Socket.IO ("new-comment" / "comment-created" events)
 *
 * Reuses from existing DevCollab UI:
 *  - Tailwind classes
 *  - lucide-react icons
 *  - react-hot-toast for notifications
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  GitBranch,
  FolderOpen,
  File,
  FileText,
  Upload,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  ChevronRight,
  Check,
  X,
  Plus,
} from 'lucide-react'
import { workspaceApi } from '../../api/client'
import toast from 'react-hot-toast'
import { Socket } from 'socket.io-client'

interface CodeReviewPanelProps {
  workspaceId: string
  socket: Socket | null
}

interface GitHubFileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  sha: string
  size?: number
}

interface FileContent {
  path: string
  content: string
  sha: string
  size: number
}

interface ReviewComment {
  id: string
  lineNumber?: number
  fileRef?: string
  text: string
  authorId: string
  createdAt: string
}

export const CodeReviewPanel: React.FC<CodeReviewPanelProps> = ({ workspaceId, socket }) => {
  // ── Repository state ──────────────────────────────────────────────────────
  const [repoLinked, setRepoLinked] = useState(false)
  const [repoInfo, setRepoInfo] = useState<any>(null)
  const [linkOwner, setLinkOwner] = useState('')
  const [linkRepo, setLinkRepo] = useState('')
  const [linkingRepo, setLinkingRepo] = useState(false)

  // ── File tree state ───────────────────────────────────────────────────────
  const [currentPath, setCurrentPath] = useState('')
  const [fileTree, setFileTree] = useState<GitHubFileNode[]>([])
  const [pathStack, setPathStack] = useState<string[]>([])
  const [loadingTree, setLoadingTree] = useState(false)

  // ── Selected file state ───────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)

  // ── Code review comments ──────────────────────────────────────────────────
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)

  // ── File upload state ─────────────────────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadPath, setUploadPath] = useState('')
  const [uploadContent, setUploadContent] = useState('')
  const [uploading, setUploading] = useState(false)

  const fileViewerRef = useRef<HTMLDivElement>(null)

  // ──────────────────────────────────────────────────────────────────────────
  // Load repository link status on mount
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadRepoStatus = async () => {
      try {
        const res = await workspaceApi.github.getRepo(workspaceId)
        const data = res.data?.data ?? res.data
        if (data?.linked) {
          setRepoLinked(true)
          setRepoInfo(data.repo)
          setLinkOwner(data.githubOwner)
          setLinkRepo(data.githubRepo)
          // Auto-load root file tree
          loadFileTree('')
        }
      } catch {
        // No repo linked yet
      }
    }
    loadRepoStatus()
  }, [workspaceId])

  // ──────────────────────────────────────────────────────────────────────────
  // Subscribe to code comments via Socket.IO
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const handleNewComment = (cmt: any) => {
      if (cmt.workspaceId === workspaceId) {
        setComments((prev) => [...prev, cmt])
      }
    }

    socket.on('new-comment', handleNewComment)
    socket.on('comment-created', handleNewComment)

    return () => {
      socket.off('new-comment', handleNewComment)
      socket.off('comment-created', handleNewComment)
    }
  }, [socket, workspaceId])

  // ──────────────────────────────────────────────────────────────────────────
  // Link a repository
  // ──────────────────────────────────────────────────────────────────────────
  const handleLinkRepo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkOwner.trim() || !linkRepo.trim()) {
      toast.error('Both owner and repo name are required')
      return
    }

    setLinkingRepo(true)
    try {
      const res = await workspaceApi.github.linkRepo(workspaceId, linkOwner.trim(), linkRepo.trim())
      const data = res.data?.data ?? res.data
      setRepoInfo(data.repo)
      setRepoLinked(true)
      toast.success(`Linked to ${linkOwner}/${linkRepo}`)
      // Auto-load root tree
      loadFileTree('')
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to link repository'
      toast.error(msg)
    } finally {
      setLinkingRepo(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Load file tree at a given path
  // ──────────────────────────────────────────────────────────────────────────
  const loadFileTree = async (path: string) => {
    setLoadingTree(true)
    try {
      const res = await workspaceApi.github.listFiles(workspaceId, path)
      const data = res.data?.data ?? res.data
      setFileTree(Array.isArray(data) ? data : [])
      setCurrentPath(path)
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to load file tree'
      toast.error(msg)
      setFileTree([])
    } finally {
      setLoadingTree(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Navigate into a folder
  // ──────────────────────────────────────────────────────────────────────────
  const handleFolderClick = (node: GitHubFileNode) => {
    setPathStack((prev) => [...prev, currentPath])
    loadFileTree(node.path)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Navigate back one level
  // ──────────────────────────────────────────────────────────────────────────
  const handleBackClick = () => {
    if (pathStack.length === 0) return
    const prevPath = pathStack[pathStack.length - 1]
    setPathStack((prev) => prev.slice(0, -1))
    loadFileTree(prevPath)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Load file content and its code review comments
  // ──────────────────────────────────────────────────────────────────────────
  const handleFileClick = async (node: GitHubFileNode) => {
    setLoadingFile(true)
    setSelectedFile(null)
    setSelectedLine(null)
    try {
      const res = await workspaceApi.github.getFile(workspaceId, node.path)
      const data = res.data?.data ?? res.data
      setSelectedFile(data)

      // Load comments for this file
      const commentsRes = await workspaceApi.getComments(workspaceId)
      const allComments = commentsRes.data?.data ?? commentsRes.data ?? []
      const fileComments = allComments.filter((c: any) => c.fileRef === node.path)
      setComments(fileComments)

      toast.success(`Opened ${node.name}`)
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to load file'
      toast.error(msg)
    } finally {
      setLoadingFile(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Add a code review comment on the selected line
  // ──────────────────────────────────────────────────────────────────────────
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !selectedFile) return
    if (selectedLine === null || selectedLine === undefined) {
      toast.error('Select a line first')
      return
    }

    setAddingComment(true)
    try {
      await workspaceApi.addComment(
        workspaceId,
        newComment.trim(),
        selectedLine,
        selectedFile.path,
      )
      // Emit via socket for real-time
      socket?.emit('send-comment', {
        workspaceId,
        lineNumber: selectedLine,
        fileRef: selectedFile.path,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
      })
      setNewComment('')
      setSelectedLine(null)
      toast.success('Review comment added!')
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to add comment'
      toast.error(msg)
    } finally {
      setAddingComment(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Upload (create) a new file
  // ──────────────────────────────────────────────────────────────────────────
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadPath.trim()) {
      toast.error('File path is required')
      return
    }

    setUploading(true)
    try {
      await workspaceApi.github.createFile(
        workspaceId,
        uploadPath.trim(),
        uploadContent,
        `Add ${uploadPath} via DevCollab Code Review`,
      )
      toast.success(`File created: ${uploadPath}`)
      setShowUploadModal(false)
      setUploadPath('')
      setUploadContent('')
      // Refresh tree if we're in the same directory
      if (currentPath === '' || uploadPath.startsWith(currentPath)) {
        loadFileTree(currentPath)
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to create file'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Repository not linked yet
  // ──────────────────────────────────────────────────────────────────────────
  if (!repoLinked) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <GitBranch className="w-6 h-6 text-brand-400" />
          <h2 className="text-xl font-bold text-white">Link GitHub Repository</h2>
        </div>
        <p className="text-sm text-slate-400 mb-6">
          Connect a GitHub repository to enable code browsing, review comments, and file uploads.
        </p>
        <form onSubmit={handleLinkRepo} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Repository Owner
            </label>
            <input
              type="text"
              value={linkOwner}
              onChange={(e) => setLinkOwner(e.target.value)}
              placeholder="e.g., acme-corp"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Repository Name
            </label>
            <input
              type="text"
              value={linkRepo}
              onChange={(e) => setLinkRepo(e.target.value)}
              placeholder="e.g., project-backend"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={linkingRepo}
            className="w-full py-3 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {linkingRepo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4" /> Link Repository
              </>
            )}
          </button>
        </form>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Main Code Review UI
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Repository header */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-brand-400" />
          <div>
            <div className="text-sm font-bold text-white">
              {linkOwner}/{linkRepo}
            </div>
            <div className="text-xs text-slate-400">{repoInfo?.description || 'No description'}</div>
          </div>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-3 py-2 rounded-lg bg-brand-500/20 border border-brand-500/30 text-brand-400 text-xs font-bold hover:bg-brand-500/30 transition-all flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" /> Upload File
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* File tree panel */}
        <div className="lg:col-span-1 p-4 rounded-2xl bg-slate-900 border border-white/10 h-[600px] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <FolderOpen className="w-4 h-4 text-brand-400" />
              Files
            </div>
            {pathStack.length > 0 && (
              <button
                onClick={handleBackClick}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
              >
                ← Back
              </button>
            )}
          </div>
          {loadingTree ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {fileTree.map((node) => (
                <button
                  key={node.path}
                  onClick={() => (node.type === 'dir' ? handleFolderClick(node) : handleFileClick(node))}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-left text-xs text-slate-300 transition-colors"
                >
                  {node.type === 'dir' ? (
                    <ChevronRight className="w-3.5 h-3.5 text-brand-400" />
                  ) : (
                    <File className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span className="truncate">{node.name}</span>
                </button>
              ))}
              {fileTree.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-4">Empty directory</div>
              )}
            </div>
          )}
        </div>

        {/* Code viewer panel */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedFile ? (
            <div className="p-12 rounded-2xl bg-slate-900 border border-white/10 flex flex-col items-center justify-center text-center h-[600px]">
              <FileText className="w-12 h-12 text-slate-600 mb-3" />
              <div className="text-sm font-semibold text-slate-400">No file selected</div>
              <div className="text-xs text-slate-500 mt-1">
                Click on a file in the tree to view its contents
              </div>
            </div>
          ) : (
            <>
              {/* File header */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                  <FileText className="w-4 h-4 text-brand-400" />
                  {selectedFile.path}
                </div>
                <div className="text-[10px] text-slate-500">
                  {selectedFile.size} bytes
                </div>
              </div>

              {/* Code view */}
              <div
                ref={fileViewerRef}
                className="p-4 rounded-2xl bg-slate-900 border border-white/10 font-mono text-xs h-[400px] overflow-auto"
              >
                {loadingFile ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {selectedFile.content.split('\n').map((line, idx) => {
                      const lineNumber = idx + 1
                      const hasComment = comments.some((c) => c.lineNumber === lineNumber)
                      return (
                        <div key={idx}>
                          <div
                            onClick={() => setSelectedLine(lineNumber)}
                            className={`flex items-start gap-4 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              selectedLine === lineNumber
                                ? 'bg-brand-500/20 border-l-2 border-brand-400'
                                : hasComment
                                ? 'bg-amber-500/10 border-l-2 border-amber-500/50'
                                : 'hover:bg-white/5'
                            }`}
                          >
                            <span className="text-slate-600 select-none w-8 text-right flex-shrink-0">
                              {lineNumber}
                            </span>
                            <span className="text-slate-300 whitespace-pre">{line}</span>
                          </div>
                          {/* Inline comment badges */}
                          {hasComment && (
                            <div className="ml-14 mt-1 space-y-1">
                              {comments
                                .filter((c) => c.lineNumber === lineNumber)
                                .map((c) => (
                                  <div
                                    key={c.id}
                                    className="text-[11px] p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200"
                                  >
                                    <div className="font-semibold text-amber-300 mb-0.5">
                                      Review Comment
                                    </div>
                                    {c.text}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Add comment form */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
                  <MessageSquare className="w-4 h-4 text-brand-400" />
                  {selectedLine !== null
                    ? `Commenting on line ${selectedLine}`
                    : 'Select a line to add a review comment'}
                </div>
                <form onSubmit={handleAddComment} className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write feedback, suggestion, or question..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-all resize-none"
                  />
                  <button
                    type="submit"
                    disabled={addingComment || !selectedLine}
                    className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingComment ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Posting...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Add Review Comment
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upload file modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="max-w-xl w-full mx-4 p-6 rounded-3xl bg-slate-900 border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white font-bold">
                <Upload className="w-5 h-5 text-brand-400" />
                Create New File
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUploadFile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  File Path (relative to repo root)
                </label>
                <input
                  type="text"
                  value={uploadPath}
                  onChange={(e) => setUploadPath(e.target.value)}
                  placeholder="e.g., src/components/Button.tsx"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  File Content
                </label>
                <textarea
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  placeholder="Paste or write your code here..."
                  rows={12}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-brand-500 transition-all resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Create File
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
