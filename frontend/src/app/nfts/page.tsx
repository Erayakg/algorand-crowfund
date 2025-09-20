'use client'

import { useState, useEffect } from 'react'
import { NFT } from '@/types'

export default function NFTs() {
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Check if wallet is connected
    const savedAddress = localStorage.getItem('wallet_address')
    if (savedAddress) {
      setConnected(true)
      
      // Mock NFT data - will be replaced with actual blockchain data
      const mockNFTs: NFT[] = [
        {
          assetId: 123456,
          name: "Reward NFT - Eco-Friendly Solar Panel Project",
          projectName: "Eco-Friendly Solar Panel Project",
          contributionAmount: 150000000, // 150 ALGO
          url: "ipfs://QmHash123..."
        },
        {
          assetId: 789012,
          name: "Reward NFT - AI Education Platform",
          projectName: "AI Education Platform",
          contributionAmount: 600000000, // 600 ALGO
          url: "ipfs://QmHash456..."
        }
      ]
      
      setTimeout(() => {
        setNfts(mockNFTs)
        setLoading(false)
      }, 1000)
    } else {
      setLoading(false)
    }
  }, [])

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

      {nfts.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No NFTs yet
            </h3>
            <p className="text-gray-600 mb-6">
              Contribute to projects above the threshold amount to earn exclusive reward NFTs!
            </p>
            <a
              href="/projects"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Projects
            </a>
          </div>
        </div>
      ) : (
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
                    Reward NFT
                  </span>
                  <button className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
