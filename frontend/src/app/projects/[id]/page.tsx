'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Project } from '@/types'

export default function ProjectDetail() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [contributeAmount, setContributeAmount] = useState('')
  const [contributing, setContributing] = useState(false)
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState('')

  useEffect(() => {
    // Check if wallet is connected
    const savedAddress = localStorage.getItem('wallet_address')
    if (savedAddress) {
      setConnected(true)
      setAddress(savedAddress)
    }

    // Mock project data - will be replaced with actual blockchain data
    const mockProject: Project = {
      id: parseInt(params.id as string),
      name: "Eco-Friendly Solar Panel Project",
      description: "A community-driven initiative to install solar panels in local schools. This project aims to provide clean, renewable energy to educational institutions while teaching students about sustainability and environmental responsibility. The solar panels will not only reduce the schools' carbon footprint but also serve as a practical learning tool for students studying renewable energy technologies.",
      creator: "0x1234...5678",
      targetAmount: 5000000000, // 5000 ALGO
      deadline: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
      collectedAmount: 2500000000, // 2500 ALGO
      category: "Environment",
      threshold: 100000000, // 100 ALGO
      active: true
    }
    
    setTimeout(() => {
      setProject(mockProject)
      setLoading(false)
    }, 1000)
  }, [params.id])

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

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connected) {
      alert('Please connect your wallet first')
      return
    }

    setContributing(true)
    try {
      // TODO: Implement actual contribution with smart contract
      console.log('Contributing:', contributeAmount, 'ALGO to project', project?.id)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      alert('Contribution successful!')
      setContributeAmount('')
    } catch (error) {
      console.error('Failed to contribute:', error)
      alert('Failed to contribute. Please try again.')
    } finally {
      setContributing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-6">The project you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/projects')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  const progressPercentage = getProgressPercentage(project.collectedAmount, project.targetAmount)
  const timeRemaining = getTimeRemaining(project.deadline)
  const isExpired = timeRemaining === 'Expired'
  const canWithdraw = progressPercentage >= 100 && isExpired
  const canRefund = progressPercentage < 100 && isExpired

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Projects
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {project.category}
              </span>
            </div>
            <div className="text-right">
              <div className={`text-lg font-semibold ${
                isExpired ? 'text-red-600' : 'text-green-600'
              }`}>
                {timeRemaining}
              </div>
              <div className="text-sm text-gray-500">
                Deadline: {formatTimestamp(project.deadline)}
              </div>
            </div>
          </div>

          <p className="text-gray-700 text-lg mb-8 leading-relaxed">
            {project.description}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Target Amount</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatAlgoAmount(project.targetAmount)} ALGO
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Collected Amount</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatAlgoAmount(project.collectedAmount)} ALGO
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">NFT Reward Threshold</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatAlgoAmount(project.threshold)}+ ALGO
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">NFT Rewards</h3>
            <p className="text-blue-800">
              Contributors who donate {formatAlgoAmount(project.threshold)} ALGO or more will receive 
              an exclusive NFT reward when the project reaches its funding goal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Contribute to this Project</h3>
              
              {!connected ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    Please connect your wallet to contribute to this project.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContribute} className="space-y-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (ALGO)
                    </label>
                    <input
                      type="number"
                      id="amount"
                      min="1"
                      step="0.1"
                      value={contributeAmount}
                      onChange={(e) => setContributeAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={contributing || isExpired}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {contributing ? 'Processing...' : isExpired ? 'Project Expired' : 'Contribute Now'}
                  </button>
                </form>
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Project Actions</h3>
              
              <div className="space-y-3">
                {canWithdraw && address === project.creator && (
                  <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Withdraw Funds
                  </button>
                )}
                
                {canRefund && connected && (
                  <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                    Claim Refund
                  </button>
                )}
                
                {progressPercentage >= 100 && isExpired && connected && (
                  <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Mint Reward NFT
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
