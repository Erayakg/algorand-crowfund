'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/types'
import { getAlgodClient, getProjects, APP_ID } from '@/utils/algorand'

export const ProjectList = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    const fetchProjects = async () => {
      console.log('🔍 Fetching projects from blockchain...')
      console.log('📱 App ID:', APP_ID)

      try {
        const client = getAlgodClient()
        const blockchainProjects = await getProjects(client, APP_ID)
        console.log('✅ Blockchain projects fetched:', blockchainProjects)
        console.log('📊 Project count:', blockchainProjects.length)

        if (blockchainProjects.length === 0) {
          console.log('⚠️ No projects found on blockchain - using mock data')
          // Fall back to mock data if no projects found
          const mockProjects: Project[] = [
            {
              id: 1,
              name: "Mock Project (No blockchain data)",
              description: "This is mock data - no real projects found",
              creator: "0x1234...5678",
              targetAmount: 5000000000,
              deadline: Math.floor(Date.now() / 1000) + 86400 * 30,
              collectedAmount: 2500000000,
              category: "Test",
              threshold: 100000000,
              active: true
            }
          ]
          setProjects(mockProjects)
        } else {
          setProjects(blockchainProjects)
        }
      } catch (error) {
        console.error('❌ Error fetching projects:', error)
        // Fall back to mock data if blockchain fetch fails
        const mockProjects: Project[] = [
          {
            id: 1,
            name: "Error Project (Fetch failed)",
            description: "Could not fetch from blockchain - check console for errors",
            creator: "0x1234...5678",
            targetAmount: 5000000000,
            deadline: Math.floor(Date.now() / 1000) + 86400 * 30,
            collectedAmount: 2500000000,
            category: "Error",
            threshold: 100000000,
            active: true
          }
        ]
        setProjects(mockProjects)
      } finally {
        setLoading(false)
        console.log('✨ Project fetching completed')
      }
    }

    fetchProjects()
  }, [])

  const categories = ['all', ...new Set(projects.map(p => p.category))]

  const filteredProjects = selectedCategory === 'all'
    ? projects
    : projects.filter(p => p.category === selectedCategory)

  const formatAlgoAmount = (microAlgos: number): string => {
    return (microAlgos / 1000000).toFixed(2)
  }

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const getTimeRemaining = (deadline: number): string => {
    const now = Math.floor(Date.now() / 1000)
    const remaining = deadline - now

    if (remaining <= 0) {
      return 'Expired'
    }

    const days = Math.floor(remaining / 86400)
    const hours = Math.floor((remaining % 86400) / 3600)

    if (days > 0) {
      return `${days} days left`
    } else {
      return `${hours} hours left`
    }
  }

  const getProgressPercentage = (collected: number, target: number): number => {
    if (target === 0) return 0
    return Math.min((collected / target) * 100, 100)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Projects</h2>

        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(project => (
          <div key={project.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {project.name}
                </h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {project.category}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {project.description}
              </p>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{formatAlgoAmount(project.collectedAmount)} ALGO</span>
                  <span>{formatAlgoAmount(project.targetAmount)} ALGO</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage(project.collectedAmount, project.targetAmount)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>Deadline: {formatTimestamp(project.deadline)}</span>
                <span className={`font-medium ${getTimeRemaining(project.deadline) === 'Expired' ? 'text-red-600' : 'text-green-600'
                  }`}>
                  {getTimeRemaining(project.deadline)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  NFT reward: {formatAlgoAmount(project.threshold)}+ ALGO
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  Contribute
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No projects found in this category.</p>
        </div>
      )}
    </div>
  )
}
