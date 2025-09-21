'use client'

import { useState, useEffect } from 'react'
import { ConnectWallet } from '@/components/ConnectWallet'
import { APP_ID, ProjectCreateData, buildCreateProjectTxn, getAlgodClient, parseAlgoAmount, submitSignedTransaction, toPeraTxnBase64 } from '@/utils/algorand'
import type { PeraWalletConnect } from '@perawallet/connect'
import { useRouter } from 'next/navigation'
import algosdk from 'algosdk'

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
  const [deadlineDays, setDeadlineDays] = useState('30')
  const [category, setCategory] = useState('General')

  // UX state
  const [submitting, setSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setTxId(null)

    if (!connected || !pera) {
      setError('Please connect Pera Wallet first.')
      return
    }

    // Ensure we have a sender address (reconnect if needed)
    const sanitize = (s: string) => (s || '').replace(/[^\x20-\x7E]/g, '').trim()
    let senderAddr = sanitize(address) || sanitize((pera as any)?.connector?.accounts?.[0])
    if (!senderAddr) {
      try {
        const accs = await pera.reconnectSession()
        if (accs && accs.length > 0) {
          senderAddr = sanitize(accs[0])
          setAddress(senderAddr)
        }
      } catch (e) {
        // ignore, we will handle below
      }
    }
    if (!senderAddr) {
      setError('Wallet address is not available. Please reconnect.')
      return
    }

    try {
      setSubmitting(true)

      const targetAmount = parseAlgoAmount(targetAlgos)
      const deadline = Math.floor(Date.now() / 1000) + (parseInt(deadlineDays || '30', 10) * 86400)

      const data: ProjectCreateData = {
        name: name.trim(),
        description: description.trim(),
        targetAmount,
        deadline,
        category: category.trim() || 'General'
      }

      const client = getAlgodClient()
      console.log('Using sender for create:', senderAddr)
      const unsignedTxn = await buildCreateProjectTxn(client, senderAddr, APP_ID, data)
      console.log('Unsigned txn class:', (unsignedTxn as any)?.constructor?.name)

      // Convert transaction to base64 for Pera Wallet
      const txnB64 = toPeraTxnBase64(unsignedTxn)
      const groupsB64 = [[{ txn: txnB64 } as any]]
      
      let signedResult: any
      try {
        signedResult = await pera.signTransaction(groupsB64 as any)
      } catch (eObj) {
        console.warn('Base64 signing failed, trying object format...', eObj)
        // Fallback to object format
        const txnObj = (unsignedTxn as any)?.get_obj_for_encoding
          ? (unsignedTxn as any).get_obj_for_encoding()
          : (unsignedTxn as any)
        const groupsObjectFirst = [[{ txn: txnObj } as any]]
        signedResult = await pera.signTransaction(groupsObjectFirst as any)
      }

      // Normalize return to a single Uint8Array (first signed txn)
      const flatten = (arr: any): any[] => Array.isArray(arr) ? arr.flat(Infinity) : [arr]
      const flattened = flatten(signedResult)
      const firstSigned = flattened.find((x: any) => x instanceof Uint8Array || (x && typeof x === 'object' && typeof x.byteLength === 'number'))
      if (!firstSigned) {
        throw new Error('Wallet did not return signed bytes')
      }
      const signedBytes: Uint8Array = firstSigned as Uint8Array

      // Submit and wait for confirmation
      const confirmedTxId = await submitSignedTransaction(client, signedBytes)
      setTxId(confirmedTxId)
      // Redirect to projects after a short delay
      setTimeout(() => router.push('/projects'), 1200)
    } catch (err: any) {
      console.error('Create project failed:', err)
      if (err?.message?.includes('Transaction request pending')) {
        setError('A transaction is already pending in your wallet. Please complete or cancel it before trying again.')
        return
      }
      setError(err?.message || 'Transaction failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Project</h1>

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
              setPera(null)
            }}
            onConnectPera={(p) => setPera(p)}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="My Awesome Project"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="What is this project about?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Target (ALGO)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetAlgos}
                onChange={(e) => setTargetAlgos(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Deadline (days)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="General"
            />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          {txId && (
            <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">Transaction confirmed: {txId}</div>
          )}

          <button
            type="submit"
            disabled={!connected || submitting}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : (connected ? 'Create Project' : 'Connect Pera Wallet')}
          </button>
        </form>
      </div>
    </div>
  )
}

