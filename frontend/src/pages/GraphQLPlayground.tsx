import React, { useState } from 'react'
import { discoveryApi } from '../api/client'
import { Play, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { ServiceHeader } from '../components/ServiceHeader'

const SAMPLE_QUERIES = [
  {
    name: 'Query All Projects',
    query: `query GetAllProjects {
  projects(page: 0, size: 10) {
    id
    title
    category
    budget
    currency
    status
    requiredSkills
  }
}`,
  },
  {
    name: 'Search Projects (Elasticsearch / DB)',
    query: `query SearchProjects {
  searchProjects(keyword: "React", skills: ["TypeScript"]) {
    id
    title
    category
    budget
    status
    requiredSkills
  }
}`,
  },
  {
    name: 'Query Recommendations by Skills',
    query: `query GetRecommendations {
  matchRecommendations(studentId: "99999999-9999-9999-9999-999999999999") {
    matchScore
    matchingSkills
    project {
      id
      title
      category
      budget
    }
  }
}`,
  },
  {
    name: 'Mutation: Create Project',
    query: `mutation CreateNewProject {
  createProject(input: {
    title: "GraphQL Spring Boot Microservice"
    description: "Implement unified GraphQL schema & resolvers with PostgreSQL"
    category: "Backend"
    budget: 2200.0
    currency: "USD"
    requiredSkills: ["Java", "Spring Boot", "GraphQL", "PostgreSQL"]
  }) {
    id
    title
    category
    budget
    status
  }
}`,
  },
]

export const GraphQLPlayground: React.FC = () => {
  const [query, setQuery] = useState(SAMPLE_QUERIES[0].query)
  const [response, setResponse] = useState<string>('// Run a query to see GraphQL JSON response')
  const [loading, setLoading] = useState(false)

  const handleExecute = async () => {
    setLoading(true)
    try {
      const res = await discoveryApi.graphql(query)
      setResponse(JSON.stringify(res.data, null, 2))
      toast.success('Query executed successfully')
    } catch (err: any) {
      console.error(err)
      const errData = err.response?.data ?? { error: err.message }
      setResponse(JSON.stringify(errData, null, 2))
      toast.error('GraphQL query failed')
    } finally {
      setLoading(false)
    }
  }

  const copyResponse = () => {
    navigator.clipboard.writeText(response)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="space-y-6">
      {/* Service 1 Discovery Banner */}
      <ServiceHeader
        service="discovery"
        title="GraphQL API Explorer"
        subtitle="Test interactive queries and mutations against Spring Boot Discovery & Matching schema (/graphql) with PostgreSQL and Elasticsearch."
        action={
          <button
            onClick={handleExecute}
            disabled={loading}
            className="btn-primary flex items-center gap-2 self-start sm:self-auto bg-indigo-600 hover:bg-indigo-500"
          >
            <Play className="w-4 h-4 fill-white" />
            {loading ? 'Executing...' : 'Run Query'}
          </button>
        }
      />

      {/* Preset Query Templates */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-semibold mr-1">Templates:</span>
        {SAMPLE_QUERIES.map((sample, idx) => (
          <button
            key={idx}
            onClick={() => setQuery(sample.query)}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            {sample.name}
          </button>
        ))}
      </div>

      {/* Query & Response Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="card overflow-hidden flex flex-col h-[520px]">
          <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Query / Mutation Editor</span>
            <span className="font-mono text-[10px] text-brand-400">POST /graphql</span>
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 w-full bg-slate-950 p-4 font-mono text-xs text-brand-200 resize-none focus:outline-none focus:ring-0 leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="card overflow-hidden flex flex-col h-[520px]">
          <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>JSON Response</span>
            <button
              onClick={copyResponse}
              className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
          <pre className="flex-1 w-full bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-auto whitespace-pre leading-relaxed">
            {response}
          </pre>
        </div>
      </div>
    </div>
  )
}
