'use client'

import { useState, useEffect } from 'react'
import { ConnectWallet } from '@/components/ConnectWallet'
import { ProjectList } from '@/components/ProjectList'

export default function Home() {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState('')

  useEffect(() => {
    // Check if wallet is already connected
    const savedAddress = localStorage.getItem('wallet_address')
    if (savedAddress) {
      setAddress(savedAddress)
      setConnected(true)
    }
  }, [])

  const handleWalletConnect = (walletAddress: string) => {
    setAddress(walletAddress)
    setConnected(true)
    localStorage.setItem('wallet_address', walletAddress)
  }

  const handleWalletDisconnect = () => {
    setAddress('')
    setConnected(false)
    localStorage.removeItem('wallet_address')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Algorand Crowdfunding Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Support innovative projects and earn exclusive NFT rewards
        </p>
        
        <ConnectWallet
          connected={connected}
          address={address}
          onConnect={handleWalletConnect}
          onDisconnect={handleWalletDisconnect}
        />
      </div>

      {connected && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">
            Connected: {address}
          </p>
        </div>
      )}

      <ProjectList />
    </div>
  )
}
