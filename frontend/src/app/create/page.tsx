'use client'

import { useState, useEffect } from 'react'
import { ConnectWallet } from '@/components/ConnectWallet'
import { APP_ID, ProjectCreateData, buildCreateProjectTxn, getAlgodClient, parseAlgoAmount, submitSignedTransaction, toPeraTxnBase64, isUserOptedIn, ensureOptedIn } from '@/utils/algorand'
import type { PeraWalletConnect } from '@perawallet/connect'
import { useRouter } from 'next/navigation'
import * as algosdk from 'algosdk'

export default function CreateProject() {
  const router = useRouter()

  // Wallet connection state
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState('')
  const [pera, setPera] = useState<PeraWalletConnect | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetAlgos, setTargetAlgos] = useState('')
  const [deadlineDate, setDeadlineDate] = useState(() => {
    // Default: 30 gün sonrası
    const future = new Date()
    future.setDate(future.getDate() + 30)
    return future.toISOString().split('T')[0] // YYYY-MM-DD formatı
  })
  const [category, setCategory] = useState('General')
  const [nftThresholdAlgos, setNftThresholdAlgos] = useState('10')

  // UX state
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState('')
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userOptedIn, setUserOptedIn] = useState<boolean | null>(null)
  const [checkingOptIn, setCheckingOptIn] = useState(false)

  // Try reconnect wallet on page load
  useEffect(() => {
    const reconnectWallet = async () => {
      try {
        const { PeraWalletConnect } = await import('@perawallet/connect')
        const p = new PeraWalletConnect()
        const accounts = await p.reconnectSession()
        if (accounts.length > 0) {
          const sanitize = (s: string) => (s || '').replace(/[^\x20-\x7E]/g, '').trim()
          const walletAddress = sanitize(accounts[0])
          if (walletAddress) {
            setPera(p)
            setAddress(walletAddress)
            setConnected(true)
            console.log(' [Create] Wallet reconnected:', walletAddress)
          }
        }
      } catch (error) {
        console.log(' [Create] No existing wallet session found')
      }
    }

    reconnectWallet()
  }, [])

  // Reset cache when address changes
  useEffect(() => {
    if (address) {
      setUserOptedIn(null)
    }
  }, [address])

  // Check opt-in status function
  const checkUserOptInStatus = async (userAddress: string) => {
    if (checkingOptIn) return userOptedIn

    setCheckingOptIn(true)
    try {
      const client = getAlgodClient()
      const isOptedIn = await isUserOptedIn(client, userAddress, APP_ID)
      setUserOptedIn(isOptedIn)
      return isOptedIn
    } catch (error) {
      console.error('Error checking opt-in status:', error)
      setUserOptedIn(false)
      return false
    } finally {
      setCheckingOptIn(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setTxId(null)

    if (!connected || !pera) {
      setError('Please connect Pera Wallet first.')
      return
    }

    // Ensure we have a sender address
    const sanitize = (s: string) => (s || '').replace(/[^\x20-\x7E]/g, '').trim()
    let senderAddr = sanitize(address) || sanitize((pera as any)?.connector?.accounts?.[0])

    if (!senderAddr) {
      try {
        const accs = await pera.reconnectSession()
        if (accs && accs.length > 0) {
          senderAddr = sanitize(accs[0])
          setAddress(senderAddr)
          setConnected(true)
          setUserOptedIn(null)
        }
      } catch (e) {
        console.error('Failed to reconnect wallet:', e)
        setError('Please reconnect your wallet.')
        return
      }
    }

    if (!senderAddr) {
      setError('Wallet address is not available. Please reconnect.')
      return
    }

    try {
      setSubmitting(true)
      setCurrentStep('Connecting to wallet...')

      const client = getAlgodClient()
      setCurrentStep('Verifying application permissions...')

      const isOptedIn = await checkUserOptInStatus(senderAddr)

      if (!isOptedIn) {
        const shouldOptIn = confirm(
          'Application Opt-in Required\n\n' +
          'To create projects, you need to opt-in to the application.\n' +
          'This is a one-time process that costs a small fee (~0.001 ALGO).\n\n' +
          'Click OK to proceed with opt-in, or Cancel to abort.'
        )

        if (!shouldOptIn) {
          setError('Application opt-in is required to create projects.')
          return
        }

        setCurrentStep('Processing opt-in transaction...')
        const optInSuccess = await ensureOptedIn(client, senderAddr, APP_ID, pera, isOptedIn)
        if (optInSuccess) {
          setUserOptedIn(true)
          setCurrentStep('Opt-in successful! Preparing project creation...')
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else {
          return
        }
      } else {
        setCurrentStep('Application permissions verified!')
      }

      setCurrentStep('Validating project details...')
      const targetAmount = parseAlgoAmount(targetAlgos)
      const nftThreshold = parseAlgoAmount(nftThresholdAlgos)

      // Deadline'ı seçilen tarihten hesapla
      const selectedDate = new Date(deadlineDate + 'T23:59:59') // Günün sonuna ayarla
      const deadline = Math.floor(selectedDate.getTime() / 1000)

      const data: ProjectCreateData = {
        name: name.trim(),
        description: description.trim(),
        targetAmount,
        deadline,
        category: category.trim() || 'General',
        threshold: nftThreshold
      }

      setCurrentStep('Building project creation transaction...')
      console.log('Project data:', data)

      const unsignedTxn = await buildCreateProjectTxn(client, senderAddr, APP_ID, data)
      setCurrentStep('⏳ Please confirm transaction in your wallet...')

      // Use same signing approach as opt-in (with fallback mechanism)
      let signedResult: any
      console.log('🔧 Debug - About to sign transaction...')

      try {
        const txnBytes = toPeraTxnBase64(unsignedTxn)
        console.log('🔧 Debug - Using base64 format for single transaction group')
        // Pera Wallet expects array of groups: [[transaction1], [transaction2, transaction3]]  
        // For single transaction: [[transaction]]
        signedResult = await pera.signTransaction([[{ txn: txnBytes } as any]])
      } catch (error) {
        console.warn('Base64 encoding/signing failed, trying object format...', error)
        try {
          // Fallback to object format
          const txnObj = (unsignedTxn as any)?.get_obj_for_encoding
            ? (unsignedTxn as any).get_obj_for_encoding()
            : (unsignedTxn as any)
          console.log('🔧 Debug - Using object format for single transaction group')
          signedResult = await pera.signTransaction([[{ txn: txnObj } as any]])
        } catch (error2) {
          console.warn('Object format failed, trying direct transaction...', error2)
          // Son çare: transaction nesnesini doğrudan kullan
          console.log('🔧 Debug - Using direct transaction format')
          signedResult = await pera.signTransaction([[{ txn: unsignedTxn } as any]])
        }
      }

      setCurrentStep('📡 Submitting project to blockchain...')

      const flatten = (arr: any): any[] => Array.isArray(arr) ? arr.flat(Infinity) : [arr]
      const flattened = flatten(signedResult)
      const firstSigned = flattened.find((x: any) => x instanceof Uint8Array || (x && typeof x === 'object' && typeof x.byteLength === 'number'))

      if (!firstSigned) {
        throw new Error('Wallet did not return signed bytes')
      }

      const signedBytes: Uint8Array = firstSigned as Uint8Array
      const confirmedTxId = await submitSignedTransaction(client, signedBytes)

      setCurrentStep(' Project created successfully!')
      setTxId(confirmedTxId)

      await new Promise(resolve => setTimeout(resolve, 1500))
      setTimeout(() => router.push('/projects'), 1200)

      /* COMMENTING OUT REAL SIGNING FOR TEST
      try {
        const txnBytes = toPeraTxnBase64(unsignedTxn)
        console.log('🔧 Debug - Using base64 format for single transaction group')
        // Pera Wallet expects array of groups: [[transaction1], [transaction2, transaction3]]  
        // For single transaction: [[transaction]]
        signedResult = await pera.signTransaction([[{ txn: txnBytes } as any]])
      } catch (error) {
        console.warn('Base64 encoding/signing failed, trying object format...', error)
        try {
          // Fallback to object format
          const txnObj = (unsignedTxn as any)?.get_obj_for_encoding
            ? (unsignedTxn as any).get_obj_for_encoding()
            : (unsignedTxn as any)
          console.log('🔧 Debug - Using object format for single transaction group')
          signedResult = await pera.signTransaction([[{ txn: txnObj } as any]])
        } catch (error2) {
          console.warn('Object format failed, trying direct transaction...', error2)
          // Son çare: transaction nesnesini doğrudan kullan
          console.log('🔧 Debug - Using direct transaction format')
          signedResult = await pera.signTransaction([[{ txn: unsignedTxn } as any]])
        }
      }

      setCurrentStep('📡 Submitting project to blockchain...')
      console.log('🔧 Debug - Signed result:', signedResult)
      console.log('🔧 Debug - Signed result type:', typeof signedResult)
      console.log('🔧 Debug - Signed result is array:', Array.isArray(signedResult))

      const flatten = (arr: any): any[] => Array.isArray(arr) ? arr.flat(Infinity) : [arr]
      const flattened = flatten(signedResult)
      console.log('🔧 Debug - Flattened result:', flattened)
      console.log('🔧 Debug - Flattened length:', flattened.length)
      
      const firstSigned = flattened.find((x: any) => x instanceof Uint8Array || (x && typeof x === 'object' && typeof x.byteLength === 'number'))
      console.log('🔧 Debug - First signed found:', !!firstSigned)
      console.log('🔧 Debug - First signed type:', typeof firstSigned)

      if (!firstSigned) {
      const confirmedTxId = await submitSignedTransaction(client, signedBytes)
      */

      // End of test mode

    } catch (err: any) {
      console.error('Create project failed:', err)
      const errorMsg = err?.message || 'Transaction failed'

      if (errorMsg.includes('Transaction request pending')) {
        setError('A transaction is already pending in your wallet. Please complete or cancel it before trying again.')
      } else if (errorMsg.includes('cancelled') || errorMsg.includes('rejected')) {
        setError('Transaction was cancelled by user.')
      } else {
        setError(`Project creation failed: ${errorMsg}`)
      }
    } finally {
      setSubmitting(false)
      setCurrentStep('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Loading Progress Bar */}
      {submitting && currentStep && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-green-600 to-blue-600 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span className="text-white font-medium">{currentStep}</span>
            </div>
            <div className="mt-2 w-full bg-white/20 rounded-full h-1">
              <div className="bg-white h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/10 mb-4">
              <span className="text-sm font-medium text-white/90">🚀 Powered by Algorand</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
              Create New Project
            </h1>
            <p className="text-white/70 text-lg">
              Launch your crowdfunding campaign on the blockchain
            </p>
          </div>

          {!connected ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">👛</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
              <p className="text-white/60 text-lg mb-8">Connect your Pera Wallet to create a new project</p>
              <ConnectWallet
                connected={connected}
                address={address}
                onConnect={(addr) => {
                  setConnected(true)
                  setAddress(addr)
                }}
                onConnectPera={(peraInstance) => {
                  setPera(peraInstance)
                }}
                onDisconnect={() => {
                  setConnected(false)
                  setAddress('')
                  setPera(null)
                  setUserOptedIn(null)
                }}
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-3">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your project name"
                      maxLength={100}
                    />
                    <p className="text-white/50 text-sm mt-1">{name.length}/100 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-3">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="General">General</option>
                      <option value="Technology">Technology</option>
                      <option value="Art">Art & Creative</option>
                      <option value="Education">Education</option>
                      <option value="Environment">Environment</option>
                      <option value="Health">Health & Medical</option>
                      <option value="Community">Community</option>
                      <option value="Gaming">Gaming</option>
                      <option value="Business">Business</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-3">
                    Project Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={5}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="Describe your project, its goals, and why people should support it..."
                    maxLength={500}
                  />
                  <p className="text-white/50 text-sm mt-1">{description.length}/500 characters</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-3">
                      Target Amount (ALGO) *
                    </label>
                    <input
                      type="number"
                      value={targetAlgos}
                      onChange={(e) => setTargetAlgos(e.target.value)}
                      required
                      min="1"
                      step="0.1"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g. 100"
                    />
                    <p className="text-white/50 text-sm mt-1">Minimum: 1 ALGO</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-3">
                      Campaign End Date *
                    </label>
                    <input
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]} // Bugünden önceki tarihleri engelle
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <p className="text-white/50 text-sm mt-1">Campaign will end at midnight on selected date</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-3">
                      NFT Reward Threshold (ALGO) *
                    </label>
                    <input
                      type="number"
                      value={nftThresholdAlgos}
                      onChange={(e) => setNftThresholdAlgos(e.target.value)}
                      required
                      min="1"
                      step="0.1"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="10"
                    />
                    <p className="text-white/50 text-sm mt-1">Minimum contribution for NFT</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-white/10">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <span className="mr-2">🎁</span>
                    NFT Rewards
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Contributors who donate at least <strong>{nftThresholdAlgos} ALGO</strong> will automatically receive an exclusive NFT as a reward!
                    This creates additional incentive for larger contributions and gives supporters a unique digital collectible.
                  </p>
                </div>

                {error && (
                  <div className="p-6 bg-red-500/20 border border-red-400/30 rounded-xl">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">❌</span>
                      <h3 className="text-red-300 font-semibold">Error</h3>
                    </div>
                    <p className="text-red-200 whitespace-pre-line">{error}</p>
                  </div>
                )}

                {txId && (
                  <div className="p-6 bg-green-500/20 border border-green-400/30 rounded-xl">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">✅</span>
                      <h3 className="text-green-300 font-semibold">Success!</h3>
                    </div>
                    <p className="text-green-200 mb-3">Project created successfully!</p>
                    <p className="text-sm text-green-200/80 font-mono break-all">
                      Transaction ID: {txId}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Creating Project...</span>
                      </div>
                    ) : (
                      <>
                        <span className="mr-2">🚀</span>
                        Create Project
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/projects')}
                    disabled={submitting}
                    className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-xl font-semibold hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>

                {connected && (
                  <div className="text-center">
                    <p className="text-white/50 text-sm">
                      Connected: <span className="font-mono">{address.substring(0, 8)}...{address.substring(address.length - 8)}</span>
                    </p>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
