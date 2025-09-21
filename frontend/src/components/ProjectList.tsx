'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/types'
import { getAlgodClient, getProjects, APP_ID, buildContributeGroupTxns, submitSignedTransaction } from '@/utils/algorand'
import { PeraWalletConnect } from '@perawallet/connect'

export const ProjectList = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [pera, setPera] = useState<PeraWalletConnect | null>(null)
  const [address, setAddress] = useState<string>('')

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
    // Try reconnect wallet for contribution
    const p = new PeraWalletConnect()
    p.reconnectSession().then((accounts) => {
      if (accounts.length > 0) {
        setPera(p)
        setAddress(accounts[0])
      }
    }).catch(() => { })
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

  const parseAlgo = (s: string) => Math.floor(parseFloat(s) * 1_000_000)

  const handleContribute = async (projectId: number) => {
    try {
      // Ensure we have a connected Pera instance and a sender address
      let p = pera
      let accounts: string[] = []
      if (!p) {
        p = new PeraWalletConnect()
      }
      try {
        accounts = await p.reconnectSession()
      } catch { }
      if (!accounts || accounts.length === 0) {
        accounts = await p.connect()
      }
      if (!accounts || accounts.length === 0) throw new Error('Wallet not connected')
      setPera(p)
      const sanitize = (s: string) => (s || '').replace(/[^\x20-\x7E]/g, '').trim()
      const senderAddr = sanitize(address) || sanitize(accounts[0])
      if (!senderAddr) throw new Error('Sender address unavailable')
      if (!address) setAddress(senderAddr)

      const input = prompt('Enter amount (ALGO) to contribute:')
      if (!input) return
      const amount = parseAlgo(input)
      if (!Number.isFinite(amount) || amount <= 0) {
        alert('Invalid amount')
        return
      }

      const client = getAlgodClient()
      const txns = await buildContributeGroupTxns(client, senderAddr, APP_ID, projectId, amount)
      // Prepare object-shaped nested groups for Pera
      const toObj = (t: any) => (t?.get_obj_for_encoding ? t.get_obj_for_encoding() : t)
      const groupPayload = [txns.map((t) => ({ txn: toObj(t) }))]
      let signed: any
      try {
        signed = await p!.signTransaction(groupPayload as any)
      } catch (eObj) {
        // Fallback to base64
        const { toPeraTxnBase64 } = await import('@/utils/algorand')
        const groupB64 = [txns.map((t) => ({ txn: toPeraTxnBase64(t) }))]
        signed = await p!.signTransaction(groupB64 as any)
      }

      // Flatten and collect Uint8Array blobs
      const flatten = (arr: any): any[] => Array.isArray(arr) ? arr.flat(Infinity) : [arr]
      const signedArr = flatten(signed).filter((x: any) => x instanceof Uint8Array || (x && typeof x.byteLength === 'number'))
      if (signedArr.length === 0) throw new Error('No signed bytes returned')

      const client2 = getAlgodClient()
      const txid = await submitSignedTransaction(client2, signedArr as any)
      alert(`Contribution submitted! TxID: ${txid}`)
    } catch (e: any) {
      console.error('Contribution failed:', e)
      alert(e?.message || 'Contribution failed')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-blue-400"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-12">
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/20'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProjects.map(project => (
          <div key={project.id} className="group bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300 hover:transform hover:scale-105">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white line-clamp-2 group-hover:text-blue-300 transition-colors">
                  {project.name}
                </h3>
                <span className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 text-xs font-medium rounded-full border border-blue-400/30">
                  {project.category}
                </span>
              </div>

              <p className="text-white/70 text-sm mb-6 line-clamp-3 leading-relaxed">
                {project.description}
              </p>

              <div className="mb-6">
                <div className="flex justify-between text-sm text-white/80 mb-2">
                  <span className="font-semibold">{formatAlgoAmount(project.collectedAmount)} ALGO</span>
                  <span className="text-white/60">{formatAlgoAmount(project.targetAmount)} ALGO</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 relative"
                    style={{ width: `${getProgressPercentage(project.collectedAmount, project.targetAmount)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                </div>
                <div className="text-right text-xs text-white/60 mt-1">
                  {getProgressPercentage(project.collectedAmount, project.targetAmount).toFixed(1)}% funded
                </div>
              </div>

              <div className="flex justify-between items-center text-sm mb-6">
                <div className="text-white/60">
                  <div className="text-xs">Deadline</div>
                  <div className="font-medium">{formatTimestamp(project.deadline)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/60">Time Left</div>
                  <span className={`font-bold ${getTimeRemaining(project.deadline) === 'Expired' ? 'text-red-400' : 'text-green-400'
                    }`}>
                    {getTimeRemaining(project.deadline)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-white/50">
                  🎨 NFT reward: {formatAlgoAmount(project.threshold)}+ ALGO
                </div>
                <button 
                  onClick={() => handleContribute(project.id)} 
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Contribute
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔍</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">No Projects Found</h3>
          <p className="text-white/60 text-lg mb-8">No projects found in this category. Try selecting a different category or create a new project!</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="px-4 py-2 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/20 rounded-full text-sm font-medium transition-all duration-200"
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
