'use client'

import { useState } from 'react'
import { ConnectWallet } from '@/components/ConnectWallet'

export default function CreateProject() {
  // Simple wallet connection state
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState('')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Project</h1>

        {/* Wallet connection block */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Wallet Connection</h3>
          <ConnectWallet
            connected={connected}
            address={address}
            onConnect={(addr) => {
              setConnected(true)
              setAddress(addr)
            }}
            onDisconnect={() => {
              setConnected(false)
              setAddress('')
            }}
          />
        </div>

        {/* Disabled primary action until real signing is wired */}
        <button
          type="button"
          disabled={!connected}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connected ? 'Create Project (Coming Soon)' : 'Connect Pera Wallet'}
        </button>
      </div>
    </div>
  )
}

