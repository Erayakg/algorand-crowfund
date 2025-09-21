'use client'

import { useState, useEffect } from 'react'
import { NFT } from '@/types'
import {
  getAlgodClient,
  APP_ID,
  getUserNFTs,
  getProjects,
  checkNFTEligibility,
  buildMintNFTTxn,
  submitSignedTransaction,
  toPeraTxnBase64,
  ensureOptedIn,
  isUserOptedIn
} from '@/utils/algorand'

export default function NFTs() {
  const [nfts, setNfts] = useState<NFT[]>([])
  const [eligibleProjects, setEligibleProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [mintingNft, setMintingNft] = useState<number | null>(null)
  const [isOptedIn, setIsOptedIn] = useState(false)
  const [optingIn, setOptingIn] = useState(false)

  useEffect(() => {
    // Check if wallet is connected
    const savedAddress = localStorage.getItem('wallet_address')
    if (savedAddress) {
      setConnected(true)
      setAddress(savedAddress)
      loadUserNFTsAndEligibility(savedAddress)
    } else {
      setLoading(false)
    }
  }, [])

  const loadUserNFTsAndEligibility = async (userAddress: string) => {
    try {
      setLoading(true)
      console.log('🔍 Loading NFTs and eligibility for address:', userAddress)
      const client = getAlgodClient()

      // Check opt-in status first
      console.log('🔍 Checking opt-in status...')
      const optedIn = await isUserOptedIn(client, userAddress, APP_ID)
      console.log('📱 User opted in:', optedIn)
      setIsOptedIn(optedIn)

      // Load existing NFTs
      console.log('📱 Loading existing NFTs...')
      const userNFTs = await getUserNFTs(client, APP_ID, userAddress)
      console.log('🏆 Found NFTs:', userNFTs)
      setNfts(userNFTs)

      // Load all projects to check eligibility
      console.log('🏗️ Loading projects to check eligibility...')
      const projects = await getProjects(client, APP_ID)
      console.log('📊 Found projects:', projects.length, projects)

      const eligible: any[] = []

      // If no projects found, it might be a parsing issue - let's manually check user's local state
      if (projects.length === 0) {
        console.log('⚠️ No projects found - checking user local state directly...')
        try {
          const accountInfo = await client.accountInformation(userAddress).do()
          const localStates = (accountInfo as any)['apps-local-state'] || accountInfo.appsLocalState || []
          console.log('👤 User local states:', localStates)

          const appState = localStates.find((state: any) => state.id === APP_ID)
          if (appState) {
            console.log('📱 Found app state:', appState)
            const keyValuePairs = appState['key-value'] || []
            console.log('🔑 User local key-value pairs:')
            keyValuePairs.forEach((kvp: any, index: number) => {
              const key = Buffer.from(kvp.key, 'base64').toString()
              const value = kvp.value.uint || kvp.value.bytes
              console.log(`  ${index}: "${key}" = ${value}`)
            })

            // Look for contribution keys manually
            const contribKeys = keyValuePairs.filter((kvp: any) => {
              const key = Buffer.from(kvp.key, 'base64').toString()
              return key.startsWith('contrib_')
            })

            if (contribKeys.length > 0) {
              console.log('🎯 Found contribution keys:', contribKeys.length)
              // Create fake projects for testing
              contribKeys.forEach((kvp: any, index: number) => {
                const key = Buffer.from(kvp.key, 'base64').toString()
                const projectId = parseInt(key.split('_')[1])
                const contributionAmount = kvp.value.uint

                if (contributionAmount >= 10000000) { // 10+ ALGO
                  eligible.push({
                    id: projectId,
                    name: `Project ${projectId} (Manual Detection)`,
                    description: 'Detected from local state',
                    contributionAmount: contributionAmount
                  })
                  console.log(`✅ Found eligible contribution: Project ${projectId}, ${contributionAmount / 1000000} ALGO`)
                }
              })
            } else {
              console.log('❌ No contribution keys found in local state')
            }
          } else {
            console.log('❌ No app state found - user may not be opted in')
          }
        } catch (error) {
          console.error('❌ Error checking local state:', error)
        }
      } else {
        // Normal flow - check each project
        for (const project of projects) {
          console.log(`🎯 Checking eligibility for project ${project.id}: ${project.name}`)
          const eligibility = await checkNFTEligibility(client, APP_ID, userAddress, project.id)
          console.log(`🎁 Project ${project.id} eligibility:`, eligibility)

          if (eligibility.eligible && !eligibility.alreadyMinted) {
            console.log(`✅ User eligible for NFT on project ${project.id}`)
            eligible.push({
              ...project,
              contributionAmount: eligibility.contributionAmount
            })
          } else {
            console.log(`❌ User NOT eligible for project ${project.id}:`, {
              eligible: eligibility.eligible,
              alreadyMinted: eligibility.alreadyMinted,
              contributionAmount: eligibility.contributionAmount
            })
          }
        }
      }

      console.log('🎁 Final eligible projects:', eligible)

      // If no eligible projects found, check user's local state manually
      if (eligible.length === 0) {
        console.log('⚠️ No eligible projects found - checking user local state manually...')
        try {
          const accountInfo = await client.accountInformation(userAddress).do()
          const localStates = (accountInfo as any)['apps-local-state'] || accountInfo.appsLocalState || []
          console.log('👤 Manual check - User local states:', localStates.length)

          if (localStates.length === 0) {
            console.log('❌ User not opted into any apps - need to opt-in first!')
            console.log('💡 User needs to make a contribution first to opt-in to the app')
          } else {
            const appState = localStates.find((state: any) => state.id === APP_ID)
            if (appState) {
              console.log('📱 Found app state:', appState)
              const keyValuePairs = appState['key-value'] || []
              console.log('🔑 User local key-value pairs:')
              keyValuePairs.forEach((kvp: any, index: number) => {
                const key = Buffer.from(kvp.key, 'base64').toString()
                const value = kvp.value.uint || kvp.value.bytes
                console.log(`  ${index}: "${key}" = ${value}`)
              })

              // Look for contribution keys manually
              const contribKeys = keyValuePairs.filter((kvp: any) => {
                const key = Buffer.from(kvp.key, 'base64').toString()
                return key.startsWith('contrib_')
              })

              if (contribKeys.length > 0) {
                console.log('🎯 Found contribution keys:', contribKeys.length)
                // Create fake projects for testing
                contribKeys.forEach((kvp: any) => {
                  const key = Buffer.from(kvp.key, 'base64').toString()
                  const projectId = parseInt(key.split('_')[1])
                  const contributionAmount = kvp.value.uint

                  if (contributionAmount >= 10000000) { // 10+ ALGO
                    eligible.push({
                      id: projectId,
                      name: `Project ${projectId} (Manual Detection)`,
                      description: 'Detected from local state',
                      contributionAmount: contributionAmount
                    })
                    console.log(`✅ Found eligible contribution: Project ${projectId}, ${contributionAmount / 1000000} ALGO`)
                  }
                })
              } else {
                console.log('❌ No contribution keys found in local state')
              }
            } else {
              console.log(`❌ No app state found for app ${APP_ID}`)
            }
          }
        } catch (error) {
          console.error('❌ Error in manual local state check:', error)
        }
      }

      setEligibleProjects(eligible)
    } catch (error) {
      console.error('❌ Error loading NFTs and eligibility:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOptIn = async () => {
    if (!connected || !address) {
      alert('Please connect your wallet first')
      return
    }

    setOptingIn(true)
    try {
      const client = getAlgodClient()

      // Check if Pera Wallet is available
      if (typeof window !== 'undefined' && (window as any).peraWallet) {
        const peraWallet = (window as any).peraWallet
        await ensureOptedIn(client, address, APP_ID, peraWallet)

        // Refresh opt-in status and eligibility
        setIsOptedIn(true)
        await loadUserNFTsAndEligibility(address)

        alert('Successfully opted in to the application!')
      } else {
        alert('Pera Wallet not found. Please make sure it\'s installed and connected.')
      }
    } catch (error) {
      console.error('❌ Error opting in:', error)
      alert('Failed to opt in to the application')
    } finally {
      setOptingIn(false)
    }
  }

  const handleMintNFT = async (projectId: number, projectName: string) => {
    if (!connected || !address) {
      alert('Please connect your wallet first')
      return
    }

    setMintingNft(projectId)
    try {
      const client = getAlgodClient()
      const txn = await buildMintNFTTxn(client, address, APP_ID, projectId)

      // Check if Pera Wallet is available
      const peraWallet = (window as any).PeraWallet
      if (peraWallet) {
        const txnBytes = toPeraTxnBase64(txn)
        const signedTxns = await peraWallet.signTransaction([[{ txn: txnBytes }]])
        const txId = await submitSignedTransaction(client, signedTxns)

        alert(`🎉 NFT minted successfully!\n\nProject: ${projectName}\nTransaction ID: ${txId}`)

        // Refresh data
        loadUserNFTsAndEligibility(address)
      } else {
        alert('Pera Wallet not found. Please install Pera Wallet extension.')
      }
    } catch (error) {
      console.error('Error minting NFT:', error)
      alert('Failed to mint NFT. Please try again.')
    } finally {
      setMintingNft(null)
    }
  }

  const formatAlgoAmount = (microAlgos: number): string => {
    return (microAlgos / 1000000).toFixed(2)
  }

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My NFTs</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
            <p className="text-yellow-800 text-lg">
              Please connect your wallet to view your NFT rewards
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My NFTs</h1>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">My NFTs</h1>
        <p className="text-lg text-gray-600">
          Your exclusive reward NFTs from supported projects
        </p>
      </div>

      {/* Opt-in status section */}
      {!isOptedIn && (
        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              🔗 Ready to Earn NFT Rewards?
            </h2>
            <p className="text-blue-700 mb-4">
              You haven't opted into the application yet. Don't worry - the system will automatically
              prompt you to opt-in when you create a project or make your first contribution.
            </p>
            <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-4">
              <p className="text-blue-800 text-sm">
                📱 <strong>How it works:</strong><br />
                1. Go to any project and try to contribute<br />
                2. The system will ask for opt-in permission<br />
                3. Approve the opt-in transaction (small fee ~0.001 ALGO)<br />
                4. Start earning NFT rewards for contributions of 10+ ALGO!
              </p>
            </div>
            <a
              href="/projects"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-block"
            >
              Browse Projects to Get Started
            </a>
          </div>
        </div>
      )}

      {/* Eligible for NFT section */}
      {isOptedIn && eligibleProjects.length > 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-purple-900 mb-4 flex items-center">
              🎁 Ready to Mint NFTs
            </h2>
            <p className="text-purple-700 mb-4">
              You're eligible to mint NFT rewards for these projects:
            </p>
            <div className="space-y-3">
              {eligibleProjects.map(project => (
                <div key={project.id} className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-600">
                      Your contribution: {formatAlgoAmount(project.contributionAmount)} ALGO
                    </p>
                  </div>
                  <button
                    onClick={() => handleMintNFT(project.id, project.name)}
                    disabled={mintingNft === project.id}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    {mintingNft === project.id ? '⏳ Minting...' : '🎨 Mint NFT'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Existing NFTs section */}
      {isOptedIn && nfts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">🏆 Your NFT Collection</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nfts.map(nft => (
              <div key={nft.assetId} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <div className="text-6xl">🏆</div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {nft.name}
                  </h3>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Project:</span> {nft.projectName}
                    </div>
                    <div>
                      <span className="font-medium">Contribution:</span> {formatAlgoAmount(nft.contributionAmount)} ALGO
                    </div>
                    <div>
                      <span className="font-medium">Asset ID:</span> {nft.assetId}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Owned ✅
                    </span>
                    <button className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {isOptedIn && nfts.length === 0 && eligibleProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No NFTs yet
            </h3>
            <p className="text-gray-600 mb-6">
              Contribute 10+ ALGO to projects to earn exclusive reward NFTs!
            </p>
            <a
              href="/projects"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Projects
            </a>
          </div>
        </div>
      )}

      {/* Not opted in empty state */}
      {!isOptedIn && (
        <div className="text-center py-12">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
            <div className="text-6xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold text-blue-900 mb-2">
              Ready to start earning NFTs?
            </h3>
            <p className="text-blue-700 mb-6">
              First opt-in to the application, then contribute to projects to earn exclusive NFT rewards!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
