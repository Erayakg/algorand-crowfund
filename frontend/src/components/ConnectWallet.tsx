'use client'

import { useState } from 'react'
import { PeraWalletConnect } from '@perawallet/connect'

interface ConnectWalletProps {
  connected: boolean
  address: string
  onConnect: (address: string) => void
  onDisconnect: () => void
}

export const ConnectWallet = ({ connected, address, onConnect, onDisconnect }: ConnectWalletProps) => {
  const [connecting, setConnecting] = useState(false)
  const [peraWallet] = useState(() => new PeraWalletConnect())

  const connectWallet = async () => {
    try {
      setConnecting(true)
      
      const accounts = await peraWallet.connect()
      
      if (accounts.length > 0) {
        onConnect(accounts[0])
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
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            Wallet Connected
          </p>
          <p className="text-green-600 text-sm font-mono">
            {address}
          </p>
        </div>
        <button
          onClick={disconnectWallet}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connectWallet}
      disabled={connecting}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
    >
      {connecting ? 'Connecting...' : 'Connect Pera Wallet'}
    </button>
  )
}
