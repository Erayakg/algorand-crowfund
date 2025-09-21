import algosdk from 'algosdk'

// Browser-safe string -> Uint8Array encoder
const enc = new TextEncoder()

// Algorand Testnet configuration
export const ALGOD_TOKEN = ''
export const ALGOD_SERVER = 'https://testnet-api.algonode.cloud'
export const ALGOD_PORT = 443

// Application configuration
export const APP_ID = 746106150 // Latest deployed smart contract ID

export const getAlgodClient = () => {
  return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
}

export const formatAlgoAmount = (microAlgos: number): string => {
  return (microAlgos / 1000000).toFixed(2)
}

export const parseAlgoAmount = (algos: string): number => {
  return Math.floor(parseFloat(algos) * 1000000)
}

export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString()
}

export const getTimeRemaining = (deadline: number): string => {
  const now = Math.floor(Date.now() / 1000)
  const remaining = deadline - now

  if (remaining <= 0) {
    return 'Expired'
  }

  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

export const getProgressPercentage = (collected: number, target: number): number => {
  if (target === 0) return 0
  return Math.min((collected / target) * 100, 100)
}

export const waitForConfirmation = async (client: algosdk.Algodv2, txid: string): Promise<any> => {
  const status = await client.status().do()
  let lastRound = (status as any).lastRound || (status as any)['last-round']

  while (true) {
    try {
      const pendingInfo: any = await client.pendingTransactionInformation(txid).do()
      const confirmed = pendingInfo.confirmedRound || pendingInfo['confirmed-round']
      if (confirmed && confirmed > 0) return pendingInfo
      lastRound++
      await client.statusAfterBlock(lastRound).do()
    } catch (e) {
      console.error('Error waiting for confirmation:', e)
      throw e
    }
  }
}

export const createProject = async (
  client: algosdk.Algodv2,
  sender: string,
  privateKey: Uint8Array,
  appId: number,
  projectData: {
    name: string
    description: string
    targetAmount: number
    deadline: number
    category: string
    threshold: number
  }
): Promise<string> => {
  const params = await client.getTransactionParams().do()

  const appArgs = [
    enc.encode('create'), // Fixed: 'create' instead of 'create_project'
    enc.encode(projectData.name),
    enc.encode(projectData.description),
    algosdk.encodeUint64(projectData.targetAmount),
    algosdk.encodeUint64(projectData.deadline),
    enc.encode(projectData.category)
    // Removed threshold - backend doesn't support it
  ]

  const txn = algosdk.makeApplicationCallTxnFromObject({
    sender: sender,
    appIndex: appId,
    appArgs,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params
  })

  const signed = algosdk.signTransaction(txn, privateKey)
  const res = await client.sendRawTransaction(signed.blob).do()

  await waitForConfirmation(client, res.txid)
  return res.txid
}

// Types for project creation
export type ProjectCreateData = {
  name: string
  description: string
  targetAmount: number // in microAlgos
  deadline: number // unix seconds
  category: string
}

// Build an unsigned app call txn for 'create' action to be signed by a wallet
export const buildCreateProjectTxn = async (
  client: algosdk.Algodv2,
  sender: string,
  appId: number,
  data: ProjectCreateData
): Promise<algosdk.Transaction> => {
  if (!sender) {
    throw new Error('Address must not be null or undefined')
  }
  const normalizedSender = String(sender).replace(/[^\x20-\x7E]/g, '').trim()
  console.log('buildCreateProjectTxn sender:', normalizedSender, 'len:', normalizedSender.length)
  if (!algosdk.isValidAddress(normalizedSender)) {
    throw new Error(`Invalid Algorand address: ${normalizedSender}`)
  }

  // Validate project data fields
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Invalid project name')
  }
  if (!data.description || typeof data.description !== 'string') {
    throw new Error('Invalid project description')
  }
  if (!Number.isInteger(data.targetAmount) || data.targetAmount <= 0) {
    throw new Error('Invalid target amount')
  }
  if (!Number.isInteger(data.deadline) || data.deadline <= Math.floor(Date.now() / 1000)) {
    throw new Error('Invalid deadline')
  }
  if (!data.category || typeof data.category !== 'string') {
    throw new Error('Invalid category')
  }

  const params = await client.getTransactionParams().do()
  // Use the params directly without modification
  const suggestedParams = params

  const appArgs = [
    enc.encode('create'),
    enc.encode(data.name),
    enc.encode(data.description),
    algosdk.encodeUint64(data.targetAmount),
    algosdk.encodeUint64(data.deadline),
    enc.encode(data.category),
  ]

  return algosdk.makeApplicationCallTxnFromObject({
    sender: normalizedSender,
    appIndex: appId,
    appArgs,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams
  })
}

// Submit signed transaction bytes and wait for confirmation
export const submitSignedTransaction = async (
  client: algosdk.Algodv2,
  signed: Uint8Array | Uint8Array[]
): Promise<string> => {
  const bytesArray = Array.isArray(signed) ? signed : [signed]
  const res = await client.sendRawTransaction(bytesArray).do()
  await waitForConfirmation(client, res.txid)
  return res.txid
}

// Build a WalletConnect/Pera-friendly signing payload from a single unsigned txn
export const toPeraTxnBase64 = (txn: algosdk.Transaction): string => {
  const encoded = algosdk.encodeUnsignedTransaction(txn)
  return Buffer.from(encoded).toString('base64')
}
export const contributeToProject = async (
  client: algosdk.Algodv2,
  sender: string,
  privateKey: Uint8Array,
  appId: number,
  projectId: number,
  amount: number
): Promise<string> => {
  const params = await client.getTransactionParams().do()

  // Get application escrow address
  const appAddress = algosdk.getApplicationAddress(appId)
  const appAddrStr = (appAddress as any).toString ? (appAddress as any).toString() : String(appAddress)
  console.log('buildContributeGroupTxns appAddress:', appAddrStr)
  if (!algosdk.isValidAddress(appAddrStr)) {
    throw new Error(`Invalid application address derived from appId ${appId}: ${appAddrStr}`)
  }

  // Use the suggested params directly
  const sp = params

  // Create payment transaction
  const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: sender,
    receiver: appAddrStr,
    amount,
    suggestedParams: sp
  })

  // Create app call transaction
  const appTxn = algosdk.makeApplicationCallTxnFromObject({
    sender: sender,
    appIndex: appId,
    appArgs: [enc.encode('contribute'), algosdk.encodeUint64(projectId)],
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: sp
  })

  // Group transactions
  const group = algosdk.assignGroupID([paymentTxn, appTxn])

  const signedPayment = algosdk.signTransaction(paymentTxn, privateKey)
  const signedApp = algosdk.signTransaction(appTxn, privateKey)

  const res = await client.sendRawTransaction([
    signedPayment.blob,
    signedApp.blob
  ]).do()

  await waitForConfirmation(client, res.txid)
  return res.txid
}

// Build unsigned group (payment + app call) for 'contribute' to be signed by a wallet
export const buildContributeGroupTxns = async (
  client: algosdk.Algodv2,
  sender: string,
  appId: number,
  projectId: number,
  amount: number
): Promise<algosdk.Transaction[]> => {
  if (!sender) throw new Error('Address must not be null or undefined')
  const normalizedSender = String(sender).replace(/[^\x20-\x7E]/g, '').trim()
  console.log('buildContributeGroupTxns sender:', normalizedSender, 'len:', normalizedSender.length)
  if (!algosdk.isValidAddress(normalizedSender)) {
    throw new Error(`Invalid Algorand address: ${normalizedSender}`)
  }
  const params = await client.getTransactionParams().do()
  const suggestedParams = params

  const appAddress = algosdk.getApplicationAddress(appId)
  const appAddrStr = (appAddress as any).toString ? (appAddress as any).toString() : String(appAddress)
  console.log('buildContributeGroupTxns appAddress:', appAddrStr)
  if (!algosdk.isValidAddress(appAddrStr)) {
    throw new Error(`Invalid application address derived from appId ${appId}: ${appAddrStr}`)
  }

  console.log('buildContributeGroupTxns payment fields:', {
    from: normalizedSender,
    to: appAddrStr,
    amount,
    haveParams: !!suggestedParams,
  })
  
  // Use the suggested params directly without modification
  const sp = suggestedParams
  let paymentTxn: algosdk.Transaction
  try {
    paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: normalizedSender,
      receiver: appAddrStr,
      amount,
      suggestedParams: sp
    })
  } catch (e) {
    console.error('Payment txn build failed with sp:', sp, e)
    throw e
  }

  let appTxn: algosdk.Transaction
  try {
    appTxn = algosdk.makeApplicationCallTxnFromObject({
      sender: normalizedSender,
      appIndex: appId,
      appArgs: [enc.encode('contribute'), algosdk.encodeUint64(projectId)],
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      suggestedParams: sp
    })
  } catch (e) {
    console.error('AppCall txn build failed with sp:', sp, e)
    throw e
  }

  const [p, a] = algosdk.assignGroupID([paymentTxn, appTxn])
  return [p, a]
}

// Get projects from blockchain
export const getProjects = async (client: algosdk.Algodv2, appId: number) => {
  try {
    console.log('🔍 Getting app info for ID:', appId)
    const appInfo = await client.getApplicationByID(appId).do()
    console.log('📱 App info received:', appInfo)

    const globalState = (appInfo.params as any)['global-state'] || (appInfo.params as any).globalState || []
    console.log('🌍 Global state:', globalState)

    // Debug: Print all keys
    console.log('🔑 All keys in global state:')
    globalState.forEach((item: any, index: number) => {
      const kb = Buffer.from(item.key, 'base64')
      // Show key in a readable shape: prefix/suffix with hex for id
      let preview = ''
      try {
        preview = kb.toString()
      } catch {
        preview = Array.from(kb).map((b) => b.toString(16).padStart(2, '0')).join('')
      }
      const value = item.value.bytes
        ? Buffer.from(item.value.bytes, 'base64').toString()
        : item.value.uint
      console.log(`  ${index}: "${preview}" = ${value}`)
    })

    // Extract project count
    const projectCountState = globalState.find((item: any) =>
      Buffer.from(item.key, 'base64').toString() === 'project_count'
    )
    const projectCount = projectCountState ? projectCountState.value.uint : 0
    console.log('📊 Project count found:', projectCount)

    // Helper to read 8-byte big-endian uint64
    const readUint64BE = (bytes: Uint8Array): number => {
      let v = 0
      for (let i = 0; i < bytes.length; i++) v = v * 256 + bytes[i]
      return v
    }

    type PartialProject = {
      id: number
      name?: string
      description?: string
      creator?: string
      targetAmount?: number
      deadline?: number
      collectedAmount?: number
      category?: string
      active?: number | boolean
    }

    const byId: Record<number, PartialProject> = {}
    const prefix = Buffer.from('p_')

    for (const item of globalState) {
      const keyBytes = Buffer.from(item.key, 'base64')
      if (keyBytes.length < 2 + 8 + 1) continue // need at least 'p_' + 8-byte id + '_' + x
      // Check prefix 'p_'
      if (keyBytes[0] !== prefix[0] || keyBytes[1] !== prefix[1]) continue

      const idBytes = keyBytes.slice(2, 10) // 8 bytes from Itob
      const suffix = keyBytes.slice(10).toString()
      const id = readUint64BE(idBytes)
      if (!(id in byId)) byId[id] = { id }

      const val = item.value.bytes
        ? Buffer.from(item.value.bytes, 'base64').toString()
        : item.value.uint

      switch (suffix) {
        case '_name':
          byId[id].name = String(val)
          break
        case '_target':
          byId[id].targetAmount = Number(val)
          break
        case '_creator':
          byId[id].creator = String(val)
          break
        case '_collected':
          byId[id].collectedAmount = Number(val)
          break
        case '_deadline':
          byId[id].deadline = Number(val)
          break
        case '_category':
          byId[id].category = String(val)
          break
        case '_active':
          byId[id].active = Number(val)
          break
        case '_desc':
        case '_description':
          byId[id].description = String(val)
          break
        default:
          // Unrecognized suffix: ignore
          break
      }
    }

    const projects: any[] = []
    for (let i = 0; i < projectCount; i++) {
      const p = byId[i]
      if (!p) continue
      if (!p.name || typeof p.targetAmount !== 'number') continue

      projects.push({
        id: i,
        name: p.name,
        description: p.description || 'No description available',
        creator: p.creator || '',
        targetAmount: p.targetAmount,
        deadline: p.deadline || Math.floor(Date.now() / 1000) + 86400 * 30,
        collectedAmount: p.collectedAmount || 0,
        category: p.category || 'General',
        threshold: 0, // not stored in simple contract
        active: (typeof p.active === 'number' ? p.active === 1 : !!p.active)
      })
    }

    console.log('✅ Parsed projects:', projects)
    return projects
  } catch (error) {
    console.error('Error fetching projects:', error)
    return []
  }
}

export const withdrawFunds = async (
  client: algosdk.Algodv2,
  sender: string,
  privateKey: Uint8Array,
  appId: number,
  projectId: number
): Promise<string> => {
  const params = await client.getTransactionParams().do()

  const appArgs = [enc.encode('withdraw'), algosdk.encodeUint64(projectId)]

  const txn = algosdk.makeApplicationCallTxnFromObject({
    sender: sender,
    appIndex: appId,
    appArgs,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params
  })

  const signed = algosdk.signTransaction(txn, privateKey)
  const res = await client.sendRawTransaction(signed.blob).do()

  await waitForConfirmation(client, res.txid)
  return res.txid
}

export const claimRefund = async (
  client: algosdk.Algodv2,
  sender: string,
  privateKey: Uint8Array,
  appId: number,
  projectId: number
): Promise<string> => {
  const params = await client.getTransactionParams().do()

  const appArgs = [enc.encode('refund'), algosdk.encodeUint64(projectId)]

  const txn = algosdk.makeApplicationCallTxnFromObject({
    sender: sender,
    appIndex: appId,
    appArgs,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params
  })

  const signed = algosdk.signTransaction(txn, privateKey)
  const res = await client.sendRawTransaction(signed.blob).do()

  await waitForConfirmation(client, res.txid)
  return res.txid
}

export const mintRewardNFT = async (
  client: algosdk.Algodv2,
  sender: string,
  privateKey: Uint8Array,
  appId: number,
  projectId: number
): Promise<string> => {
  const params = await client.getTransactionParams().do()

  const appArgs = [enc.encode('mint_nft'), algosdk.encodeUint64(projectId)]

  const txn = algosdk.makeApplicationCallTxnFromObject({
    sender: sender,
    appIndex: appId,
    appArgs,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params
  })

  const signed = algosdk.signTransaction(txn, privateKey)
  const res = await client.sendRawTransaction(signed.blob).do()

  await waitForConfirmation(client, res.txid)
  return res.txid
}

export const optInToApp = async (
  client: algosdk.Algodv2,
  sender: string,
  privateKey: Uint8Array,
  appId: number
): Promise<string> => {
  const params = await client.getTransactionParams().do()

  const txn = algosdk.makeApplicationOptInTxnFromObject({
    sender: sender,
    appIndex: appId,
    suggestedParams: params
  })

  const signed = algosdk.signTransaction(txn, privateKey)
  const res = await client.sendRawTransaction(signed.blob).do()

  await waitForConfirmation(client, res.txid)
  return res.txid
}
