'use client'

import { useState, useEffect } from 'react'
import { PeraWalletConnect } from '@perawallet/connect'

interface ConnectWalletProps {
  connected: boolean
  address: string
  onConnect: (address: string) => void
  onDisconnect: () => void
  onConnectPera?: (pera: PeraWalletConnect) => void
}

export const ConnectWallet = ({ connected, address, onConnect, onDisconnect, onConnectPera }: ConnectWalletProps) => {
  const [connecting, setConnecting] = useState(false)
  const [peraWallet] = useState(() => new PeraWalletConnect({
    chainId: 416002 // Algorand Testnet chain ID
  }))

  // Check for existing connection on component mount (recommended API)
  useEffect(() => {
    const reconnect = async () => {
      try {
        const accounts = await peraWallet.reconnectSession()
        if (accounts.length > 0 && !connected) {
          onConnect(accounts[0])
          if (onConnectPera) onConnectPera(peraWallet)
        }
      } catch (error) {
        console.error('Error during reconnectSession:', error)
      }
    }

    reconnect()
  }, [peraWallet, connected, onConnect, onConnectPera])

  const connectWallet = async () => {
    try {
      setConnecting(true)
      // Try to reuse existing session first
      const existing = await peraWallet.reconnectSession()
      const accounts = existing.length > 0 ? existing : await peraWallet.connect()

      if (accounts.length > 0) {
        onConnect(accounts[0])
        if (onConnectPera) onConnectPera(peraWallet)
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setConnecting(false)
    }
  }

  const disconnectWallet = () => {
    peraWallet.disconnect()
    onDisconnect()
  }

  if (connected) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-400/30 rounded-2xl">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <p className="text-green-300 font-semibold">
              Wallet Connected
            </p>
          </div>
          <p className="text-green-200/80 text-sm font-mono break-all">
            {address.slice(0, 8)}...{address.slice(-8)}
          </p>
        </div>
        <button
          onClick={disconnectWallet}
          className="px-6 py-3 bg-red-500/20 text-red-300 border border-red-400/30 rounded-xl hover:bg-red-500/30 transition-all duration-200 font-medium"
        >
          Disconnect Wallet
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connectWallet}
      disabled={connecting}
      className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
    >
      {connecting ? (
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span>Connecting...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <span>🚀</span>
          <span>Connect Pera Wallet</span>
        </div>
      )}
    </button>
  )
}
