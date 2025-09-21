'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/types'
import { getAlgodClient, getProjects, APP_ID, buildContributeGroupTxns, submitSignedTransaction, isUserOptedIn, ensureOptedIn } from '@/utils/algorand'
import { PeraWalletConnect } from '@perawallet/connect'
import * as algosdk from 'algosdk'

export const ProjectList = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [pera, setPera] = useState<PeraWalletConnect | null>(null)
  const [address, setAddress] = useState<string>('')
  const [contributingProject, setContributingProject] = useState<number | null>(null)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [showContributionModal, setShowContributionModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<{ id: number; name: string } | null>(null)
  const [contributionAmount, setContributionAmount] = useState<string>('')
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showNFTReward, setShowNFTReward] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [userOptedIn, setUserOptedIn] = useState<boolean | null>(null)
  const [checkingOptIn, setCheckingOptIn] = useState(false)

  // Reset cache when address changes (including disconnect)
  useEffect(() => {
    setUserOptedIn(null)
    setCheckingOptIn(false)
    if (address) {
      console.log('🔄 [Cache] Address changed, opt-in cache reset for:', address)
    } else {
      console.log('🔄 [Cache] Wallet disconnected, opt-in cache cleared')
    }
  }, [address])

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
        const newAddress = accounts[0]
        if (newAddress !== address) {
          setAddress(newAddress)
          setUserOptedIn(null) // Reset cache for different wallet
          console.log('🔄 Wallet reconnected, cache reset for new address:', newAddress)
        }
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

  const checkUserOptInStatus = async (userAddress: string) => {
    if (checkingOptIn) return userOptedIn

    setCheckingOptIn(true)
    try {
      const client = getAlgodClient()
      console.log('🔍 Checking opt-in status for address:', userAddress, 'App ID:', APP_ID)

      const isOptedIn = await isUserOptedIn(client, userAddress, APP_ID)
      console.log('✅ Opt-in status result:', isOptedIn)

      setUserOptedIn(isOptedIn)
      return isOptedIn
    } catch (error) {
      console.error('❌ Error checking opt-in status:', error)
      setUserOptedIn(false)
      return false
    } finally {
      setCheckingOptIn(false)
    }
  }

  const handleContribute = (projectId: number, projectName: string = '') => {
    if (!projectName) {
      const project = projects.find(p => p.id === projectId)
      projectName = project?.name || `Project ${projectId}`
    }
    setSelectedProject({ id: projectId, name: projectName })
    setShowContributionModal(true)
    setContributionAmount('')
    setErrorMessage('')
  }

  const processContribution = async () => {
    if (!selectedProject || !contributionAmount) return

    const amount = parseAlgo(contributionAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage('❌ Please enter a valid positive amount.')
      return
    }

    setShowContributionModal(false)
    setContributingProject(selectedProject.id)
    setCurrentStep('Connecting to wallet...')

    try {
      // Ensure we have a connected Pera instance and a sender address
      setCurrentStep('Checking wallet connection...')
      let p = pera
      let accounts: string[] = []
      if (!p) {
        p = new PeraWalletConnect()
      }
      try {
        accounts = await p.reconnectSession()
      } catch { }
      if (!accounts || accounts.length === 0) {
        setCurrentStep('Please connect your wallet...')
        accounts = await p.connect()
      }
      if (!accounts || accounts.length === 0) throw new Error('Wallet not connected')
      setPera(p)

      const sanitize = (s: string) => (s || '').replace(/[^\x20-\x7E]/g, '').trim()
      const senderAddr = sanitize(accounts[0]) // Always use fresh account from wallet
      if (!senderAddr) throw new Error('Sender address unavailable')

      // Always update address to current wallet account
      if (address !== senderAddr) {
        console.log('🔄 [Wallet] Address changed from', address, 'to', senderAddr)
        setAddress(senderAddr)
        setUserOptedIn(null) // Reset cache for different wallet
      }

      setCurrentStep('Checking account balance...')
      const client = getAlgodClient()
      const accountInfo = await client.accountInformation(senderAddr).do()
      const balance = Number(accountInfo.amount)
      const requiredAmount = amount + 5000 // contribution + estimated fees

      if (balance < requiredAmount) {
        const balanceInAlgo = (balance / 1000000).toFixed(3)
        const neededInAlgo = (requiredAmount / 1000000).toFixed(3)
        setErrorMessage(`❌ Insufficient Balance\n\nYour balance: ${balanceInAlgo} ALGO\nRequired: ${neededInAlgo} ALGO (including fees)\n\n💡 Try contributing ${(balance / 1000000 - 0.01).toFixed(2)} ALGO or get more testnet ALGO from the faucet.`)
        return
      }

      setCurrentStep('Verifying application permissions...')
      // Check cached opt-in status first, then verify with blockchain if needed
      let isOptedIn = userOptedIn
      if (isOptedIn === null) {
        console.log('🔍 No cached opt-in status, checking blockchain...')
        isOptedIn = await checkUserOptInStatus(senderAddr)
      } else {
        console.log('💾 Using cached opt-in status:', isOptedIn)
        // Trust the cached status - no double check needed
        // If there's an error, ensureOptedIn will handle it
      }

      if (!isOptedIn) {
        console.log('❌ User not opted in, initiating opt-in process')
        setCurrentStep('Processing application opt-in...')
        try {
          const finalOptedInStatus = await ensureOptedIn(client, senderAddr, APP_ID, p, isOptedIn)
          setCurrentStep('✅ Opt-in successful! Preparing contribution...')
          setUserOptedIn(finalOptedInStatus) // Cache the final status
          // Small delay to show success message
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (optInError: any) {
          console.error('❌ Opt-in failed:', optInError)
          const optInErrorMsg = optInError?.message || 'Unknown opt-in error'

          if (!optInErrorMsg.includes('cancelled') && !optInErrorMsg.includes('rejected')) {
            setErrorMessage(`❌ Application Opt-in Failed\n\n${optInErrorMsg}\n\nThis is required to contribute and receive NFT rewards. Please try again.`)
          }
          return
        }
      } else {
        console.log('✅ User already opted in, proceeding with contribution')
        setCurrentStep('✅ Application permissions verified!')
      }

      setCurrentStep('Building contribution transaction...')
      const txns = await buildContributeGroupTxns(client, senderAddr, APP_ID, selectedProject.id, amount)

      setCurrentStep('⏳ Please confirm transaction in your wallet...')
      // Prepare object-shaped nested groups for Pera
      const toObj = (t: any) => (t?.get_obj_for_encoding ? t.get_obj_for_encoding() : t)
      const groupPayload = [txns.map((t) => ({ txn: toObj(t) }))]
      let signed: any
      try {
        signed = await p.signTransaction(groupPayload as any)
      } catch (eObj) {
        setCurrentStep('Trying alternative wallet format...')
        // Fallback to base64
        const { toPeraTxnBase64 } = await import('@/utils/algorand')
        const groupB64 = [txns.map((t) => ({ txn: toPeraTxnBase64(t) }))]
        signed = await p.signTransaction(groupB64 as any)
      }

      setCurrentStep('📡 Broadcasting transaction to blockchain...')
      // Flatten and collect Uint8Array blobs
      const flatten = (arr: any): any[] => Array.isArray(arr) ? arr.flat(Infinity) : [arr]
      const signedArr = flatten(signed).filter((x: any) => x instanceof Uint8Array || (x && typeof x.byteLength === 'number'))
      if (signedArr.length === 0) throw new Error('No signed bytes returned')

      const txid = await submitSignedTransaction(client, signedArr as any)

      setCurrentStep('✅ Transaction confirmed!')
      // Small delay to show success
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Success notification with NFT eligibility info
      const contributionInAlgo = amount / 1000000
      if (contributionInAlgo >= 10) {
        setSuccessMessage(`🎉 Contribution Successful!\n\nAmount: ${contributionInAlgo} ALGO\nProject: ${selectedProject.name}\nTransaction ID: ${txid}\n\n🎁 Congratulations! You're eligible for an NFT reward when the project completes!`)
        setShowNFTReward(true)
        setTimeout(() => setShowNFTReward(false), 5000)
      } else {
        setSuccessMessage(`✅ Contribution Successful!\n\nAmount: ${contributionInAlgo} ALGO\nProject: ${selectedProject.name}\nTransaction ID: ${txid}\n\n💡 Tip: Contribute 10+ ALGO to be eligible for exclusive NFT rewards!`)
      }
      setShowSuccessNotification(true)
      setTimeout(() => setShowSuccessNotification(false), 5000)
    } catch (e: any) {
      console.error('Contribution failed:', e)
      const errorMsg = e?.message || 'An unknown error occurred'
      if (errorMsg.includes('cancelled') || errorMsg.includes('rejected')) {
        // User cancelled, don't show error
        return
      }
      setErrorMessage(`❌ Contribution Failed\n\n${errorMsg}\n\nPlease try again or contact support if the issue persists.`)
    } finally {
      setContributingProject(null)
      setCurrentStep('')
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
      {/* Contribution Amount Modal */}
      {showContributionModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-2">Contribute to Project</h3>
            <p className="text-white/70 mb-6">{selectedProject.name}</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Amount (ALGO)
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={contributionAmount}
                onChange={(e) => {
                  setContributionAmount(e.target.value)
                  setErrorMessage('')
                }}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter ALGO amount"
                autoFocus
              />
              {parseFloat(contributionAmount) >= 10 && (
                <div className="mt-2 p-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 text-sm flex items-center">
                    🎁 <span className="ml-2">NFT reward eligible!</span>
                  </p>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm whitespace-pre-line">{errorMessage}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowContributionModal(false)}
                className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={processContribution}
                disabled={!contributionAmount || parseFloat(contributionAmount) <= 0}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Contribute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl shadow-lg border border-green-400/20 animate-slideIn">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                ✅
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium whitespace-pre-line">{successMessage}</p>
              </div>
              <button
                onClick={() => setShowSuccessNotification(false)}
                className="ml-4 flex-shrink-0 text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NFT Reward Animation */}
      {showNFTReward && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl border border-purple-500/30 p-8 max-w-md w-full text-center animate-bounce">
            <div className="text-6xl mb-4 animate-pulse">🎁</div>
            <h3 className="text-3xl font-bold text-white mb-2">Congratulations!</h3>
            <p className="text-xl text-purple-200 mb-4">NFT Mint Hakkı Kazandınız!</p>
            <p className="text-white/70 mb-6">
              10+ ALGO katkınız için teşekkürler! Proje tamamlandığında özel NFT'nizi "My NFTs" sayfasından alabileceksiniz.
            </p>
            <button
              onClick={() => setShowNFTReward(false)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              Harika! 🚀
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && !showContributionModal && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white p-4 rounded-xl shadow-lg border border-red-400/20 animate-slideIn">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                ❌
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium whitespace-pre-line">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage('')}
                className="ml-4 flex-shrink-0 text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Loading Progress Bar */}
      {contributingProject !== null && currentStep && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              </div>
              <div className="flex-1">
                <div className="text-white font-medium text-sm">{currentStep}</div>
                <div className="w-full bg-white/20 rounded-full h-2 mt-1">
                  <div className="bg-white rounded-full h-2 transition-all duration-300" style={{
                    width: currentStep.includes('Connecting') ? '10%' :
                      currentStep.includes('balance') ? '20%' :
                        currentStep.includes('permissions') ? '30%' :
                          currentStep.includes('opt-in') ? '50%' :
                            currentStep.includes('Building') ? '70%' :
                              currentStep.includes('wallet') ? '80%' :
                                currentStep.includes('Broadcasting') ? '90%' :
                                  currentStep.includes('confirmed') ? '100%' : '40%'
                  }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-12">
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === category
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
                  � NFT reward: 10+ ALGO
                </div>
                <button
                  onClick={() => handleContribute(project.id, project.name)}
                  disabled={contributingProject === project.id}
                  className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${contributingProject === project.id
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-blue-600 hover:to-purple-600'
                    }`}
                >
                  {contributingProject === project.id ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Contribute'
                  )}
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
