import algosdk from 'algosdk'

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

export const waitForConfirmation = async (client: algosdk.Algodv2, txid: string): Promise<algosdk.PendingTransactionInfo> => {
  const status = await client.status().do()
  let lastRound = status['last-round']

  while (true) {
    try {
      const pendingInfo = await client.pendingTransactionInformation(txid).do()
      if (pendingInfo['confirmed-round'] && pendingInfo['confirmed-round'] > 0) {
        return pendingInfo
      }
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
    new Uint8Array(Buffer.from('create')), // Fixed: 'create' instead of 'create_project'
    new Uint8Array(Buffer.from(projectData.name)),
    new Uint8Array(Buffer.from(projectData.description)),
    algosdk.encodeUint64(projectData.targetAmount),
    algosdk.encodeUint64(projectData.deadline),
    new Uint8Array(Buffer.from(projectData.category))
    // Removed threshold - backend doesn't support it
  ]

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: sender,
    appIndex: appId,
    appArgs,
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
  const params = await client.getTransactionParams().do()
  const appArgs = [
    new Uint8Array(Buffer.from('create')),
    new Uint8Array(Buffer.from(data.name)),
    new Uint8Array(Buffer.from(data.description)),
    algosdk.encodeUint64(data.targetAmount),
    algosdk.encodeUint64(data.deadline),
    new Uint8Array(Buffer.from(data.category))
  ]

  return algosdk.makeApplicationNoOpTxn(sender, params, appId, appArgs)
}

// Submit signed transaction bytes and wait for confirmation
export const submitSignedTransaction = async (
  client: algosdk.Algodv2,
  signed: Uint8Array | Uint8Array[]
): Promise<string> => {
  const bytesArray = Array.isArray(signed) ? signed : [signed]
  const txId = await client.sendRawTransaction(bytesArray).do()
  await waitForConfirmation(client, txId.txId)
  return txId.txId
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

  // Get app address
  const appInfo = await client.getApplicationByID(appId).do()
  const appAddress = appInfo['params']['creator']

  // Create payment transaction
  const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: sender,
    to: appAddress,
    amount,
    suggestedParams: params
  })

  // Create app call transaction
  const appTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from: sender,
    appIndex: appId,
    appArgs: [new Uint8Array(Buffer.from('contribute')), algosdk.encodeUint64(projectId)],
    suggestedParams: params
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
      const decodedKey = Buffer.from(item.key, 'base64').toString()
      const value = item.value.bytes
        ? Buffer.from(item.value.bytes, 'base64').toString()
        : item.value.uint
      console.log(`  ${index}: "${decodedKey}" = ${value}`)
    })

    // Extract project count
    const projectCountState = globalState.find((item: any) =>
      Buffer.from(item.key, 'base64').toString() === 'project_count'
    )
    const projectCount = projectCountState ? projectCountState.value.uint : 0
    console.log('📊 Project count found:', projectCount)

    const projects = []

    // Get each project's data
    for (let i = 0; i < projectCount; i++) {
      console.log(`🔍 Processing project ${i}`)

      const getProjectValue = (suffix: string) => {
        // Exact key patterns from terminal output
        const possibleKeys = [
          `p__${suffix}`,            // Actual format: p__name, p__target, p__collected, p__creator
        ]

        for (const keyPattern of possibleKeys) {
          const state = globalState.find((item: any) =>
            Buffer.from(item.key, 'base64').toString() === keyPattern
          )
          if (state) {
            console.log(`✅ Found key: ${keyPattern} = ${state.value.bytes ? Buffer.from(state.value.bytes, 'base64').toString() : state.value.uint}`)
            return state.value.bytes ? Buffer.from(state.value.bytes, 'base64').toString() : state.value.uint
          }
        }
        console.log(`❌ Key not found for suffix: ${suffix}, tried: ${possibleKeys.join(', ')}`)
        return null
      }

      const name = getProjectValue('name')
      const description = getProjectValue('desc') || getProjectValue('description') || 'No description available'
      const creator = getProjectValue('creator')
      const target = getProjectValue('target')
      const deadline = getProjectValue('deadline') || Math.floor(Date.now() / 1000) + 86400 * 30 // Default 30 days
      const collected = getProjectValue('collected') || 0
      const category = getProjectValue('category') || 'General'
      const active = getProjectValue('active') !== null ? getProjectValue('active') : 1 // Default active

      console.log(`📝 Project ${i} extracted data:`, {
        name, description, creator, target, deadline, collected, category, active
      })

      // Create project even if some fields are missing
      if (name && target) {
        projects.push({
          id: i,
          name,
          description,
          creator,
          targetAmount: target,
          deadline,
          collectedAmount: collected,
          category,
          threshold: 0, // Not stored in simple contract
          active: active === 1
        })
      }
    }

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

  const appArgs = [
    new Uint8Array(Buffer.from('withdraw')),
    algosdk.encodeUint64(projectId)
  ]

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: sender,
    appIndex: appId,
    appArgs,
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

  const appArgs = [
    new Uint8Array(Buffer.from('refund')),
    algosdk.encodeUint64(projectId)
  ]

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: sender,
    appIndex: appId,
    appArgs,
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

  const appArgs = [
    new Uint8Array(Buffer.from('mint_nft')),
    algosdk.encodeUint64(projectId)
  ]

  const txn = algosdk.makeApplicationNoOpTxn(
    sender,
    params,
    appId,
    appArgs
  )

  const signedTxn = txn.signTxn(privateKey)
  const txId = await client.sendRawTransaction(signedTxn).do()

  await waitForConfirmation(client, txId.txId)
  return txId.txId
}

export const optInToApp = async (
  client: algosdk.Algodv2,
  sender: string,
  privateKey: Uint8Array,
  appId: number
): Promise<string> => {
  const params = await client.getTransactionParams().do()

  const txn = algosdk.makeApplicationOptInTxnFromObject({
    from: sender,
    appIndex: appId,
    suggestedParams: params
  })

  const signed = algosdk.signTransaction(txn, privateKey)
  const res = await client.sendRawTransaction(signed.blob).do()

  await waitForConfirmation(client, res.txid)
  return res.txid
}
