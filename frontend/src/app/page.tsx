'use client'

import { useState, useEffect } from 'react'
import { ConnectWallet } from '@/components/ConnectWallet'
import { ProjectList } from '@/components/ProjectList'
import Link from 'next/link'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/10 mb-8">
              <span className="text-sm font-medium text-white/90">🚀 Powered by Algorand Blockchain</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Rise
              </span>
              <br />
              <span className="text-white/90">Crowdfunding</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/70 mb-12 max-w-3xl mx-auto leading-relaxed">
              Fund innovative projects, earn exclusive NFT rewards, and be part of the future of decentralized crowdfunding
            </p>

            {/* Wallet Connection */}
            <div className="mb-16">
              <ConnectWallet
                connected={connected}
                address={address}
                onConnect={handleWalletConnect}
                onDisconnect={handleWalletDisconnect}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-3xl font-bold text-white mb-2">50+</div>
                <div className="text-white/70">Active Projects</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-3xl font-bold text-white mb-2">$2.5M+</div>
                <div className="text-white/70">Total Raised</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-3xl font-bold text-white mb-2">1,200+</div>
                <div className="text-white/70">Backers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose Rise?</h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Experience the next generation of crowdfunding with blockchain technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Secure & Transparent</h3>
              <p className="text-white/70">
                Built on Algorand blockchain ensuring maximum security and complete transparency
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Exclusive NFTs</h3>
              <p className="text-white/70">
                Earn unique NFT rewards for supporting projects and become part of the community
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Lightning Fast</h3>
              <p className="text-white/70">
                Instant transactions with minimal fees thanks to Algorand's high-performance network
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold text-white mb-4">Featured Projects</h2>
              <p className="text-xl text-white/70">Discover amazing projects and support their vision</p>
            </div>
            {connected && (
              <Link 
                href="/create"
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Create Project
              </Link>
            )}
          </div>

          <ProjectList />
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Join thousands of creators and backers building the future together
          </p>
          {!connected && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <ConnectWallet
                connected={connected}
                address={address}
                onConnect={handleWalletConnect}
                onDisconnect={handleWalletDisconnect}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
