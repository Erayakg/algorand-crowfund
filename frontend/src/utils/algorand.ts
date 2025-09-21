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
  threshold: number // NFT reward threshold in microAlgos (e.g. 10 ALGO = 10000000)
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
  if (!Number.isInteger(data.threshold) || data.threshold <= 0) {
    throw new Error('Invalid NFT threshold amount')
  }

  const params = await client.getTransactionParams().do()
  // Use the params directly without modification
  const suggestedParams = params

  // Debug: şu anki timestamp ve deadline'ı kontrol et
  const currentTimestamp = Math.floor(Date.now() / 1000)
  console.log('🕒 Debug - Current timestamp:', currentTimestamp)
  console.log('🕒 Debug - Project deadline:', data.deadline)
  console.log('🕒 Debug - Deadline > current?', data.deadline > currentTimestamp)

  // WORKAROUND: Smart contract timestamp validation için çok ileri bir tarih kullan
  const veryFutureDeadline = currentTimestamp + (365 * 24 * 60 * 60) // 1 yıl sonra
  console.log('🕒 Debug - Using very future deadline:', veryFutureDeadline)

  // TEST: Trying past timestamp to test timestamp validation
  const pastTimestamp = 1000000000 // Very old timestamp (2001)
  console.log('🧪 TEST - Using past timestamp:', pastTimestamp)

  // CRITICAL FIX: Smart contract expects "create" not "create_project"!
  console.log('🔧 CRITICAL FIX - Using "create" action name as per smart contract')

  const appArgs = [
    enc.encode('create'),                    // args[0] - FIXED: "create" not "create_project" 
    enc.encode(data.name),                   // args[1] - project name
    enc.encode(data.description),            // args[2] - project description
    algosdk.encodeUint64(data.targetAmount), // args[3] - target amount in microAlgos
    algosdk.encodeUint64(data.deadline),     // args[4] - deadline timestamp
    enc.encode(data.category),               // args[5] - project category
    // Note: Only 6 arguments total (no threshold for this contract)
  ]

  console.log('📋 Debug - CORRECTED App arguments:')
  console.log('  args[0] (action):', 'create', '(length:', 'create'.length, ')')
  console.log('  args[1] (name):', data.name, '(length:', data.name.length, ')')
  console.log('  args[2] (desc):', data.description, '(length:', data.description.length, ')')
  console.log('  args[3] (target):', data.targetAmount, 'microAlgos')
  console.log('  args[4] (deadline):', data.deadline, '(timestamp)')
  console.log('  args[5] (category):', data.category, '(length:', data.category.length, ')')
  console.log('  Total argument count:', appArgs.length)

  console.log('📋 Debug - EXTREME DETAIL for PC=141:')
  console.log('  - Data object received:', JSON.stringify(data))
  console.log('  - Current timestamp (now):', currentTimestamp)
  console.log('  - Future timestamp:', veryFutureDeadline)
  console.log('  - Timestamp difference:', veryFutureDeadline - currentTimestamp)
  console.log('  - Is future > now?', veryFutureDeadline > currentTimestamp)
  console.log('  - Threshold value:', data.threshold, '(type:', typeof data.threshold, ')')
  console.log('  - Threshold > 0?', Number(data.threshold) > 0)

  console.log('📋 Debug - App arguments (DETAILED):')
  console.log('  args[0]:', 'create_project', '(length:', 'create_project'.length, ')')
  console.log('  args[1]:', data.name, '(length:', data.name.length, ')')
  console.log('  args[2]:', data.description, '(length:', data.description.length, ')')
  console.log('  args[3] (timestamp):', veryFutureDeadline)
  console.log('  args[4]:', data.category, '(length:', data.category.length, ')')
  console.log('  args[5] (threshold):', Number(data.threshold))
  console.log('  Total argument count:', appArgs.length)
  console.log('  Each arg as bytes:', appArgs.map((arg, i) => `arg[${i}]: ${arg.length} bytes`))

  console.log('📋 Debug - Argument validation:')
  appArgs.forEach((arg, index) => {
    console.log(`  arg[${index}]: length=${arg.length}, first_bytes=[${Array.from(arg.slice(0, 10)).join(',')}]`)

    // Special handling for numeric arguments (only for 8-byte uint64 arguments)
    if (index === 3 && arg.length === 8) { // target amount
      const targetBytes = Array.from(arg)
      console.log(`    � Target amount bytes: [${targetBytes.join(',')}]`)
      try {
        const view = new DataView(arg.buffer)
        const decodedTarget = view.getBigUint64(0, false) // big-endian
        console.log(`    � Decoded target: ${decodedTarget} (original: ${data.targetAmount})`)
        console.log(`    � Target match: ${Number(decodedTarget) === data.targetAmount}`)
      } catch (e) {
        console.log(`    💰 Target decode error:`, e)
      }
    }

    if (index === 4 && arg.length === 8) { // deadline timestamp
      const timestampBytes = Array.from(arg)
      console.log(`    � Deadline bytes: [${timestampBytes.join(',')}]`)
      try {
        const view = new DataView(arg.buffer)
        const decodedDeadline = view.getBigUint64(0, false) // big-endian
        console.log(`    � Decoded deadline: ${decodedDeadline} (original: ${data.deadline})`)
        console.log(`    � Deadline match: ${Number(decodedDeadline) === data.deadline}`)
      } catch (e) {
        console.log(`    � Deadline decode error:`, e)
      }
    }
  })  // Use original 6 arguments, let's fix the transaction creation
  // Use ONLY the correct field names for makeApplicationCallTxnFromObject API
  try {
    const txnParams = {
      from: normalizedSender,                   // Sender address (old style)
      sender: normalizedSender,                 // Sender address (new style) - REQUIRED
      appIndex: appId,                          // Application ID
      appArgs: appArgs,                         // Application arguments
      onComplete: algosdk.OnApplicationComplete.NoOpOC, // On complete action
      suggestedParams: suggestedParams          // Transaction parameters
    }

    console.log('📋 Debug - Transaction params (CLEAN):', Object.keys(txnParams))
    console.log('📋 Debug - Params detail:')
    console.log('  - from:', txnParams.from)
    console.log('  - sender:', txnParams.sender)
    console.log('  - appIndex:', txnParams.appIndex)
    console.log('  - appArgs count:', txnParams.appArgs.length)
    console.log('  - onComplete:', txnParams.onComplete)

    const txn = algosdk.makeApplicationCallTxnFromObject(txnParams)

    console.log('📋 Debug - Transaction creation SUCCESS')
    console.log('  - Transaction type:', (txn as any).type)
    console.log('  - App index:', (txn as any).appIndex)
    console.log('  - App args in txn:', (txn as any).appArgs?.length || 'undefined')
    console.log('  - On complete:', (txn as any).onComplete)
    console.log('  - First app arg:', (txn as any).appArgs?.[0] ? Buffer.from((txn as any).appArgs[0]).toString() : 'undefined')

    // Additional verification - check all transaction fields
    console.log('📋 Debug - Transaction field verification:')
    console.log('  - txn.from:', (txn as any).from)
    console.log('  - txn.appIndex:', (txn as any).appIndex)
    console.log('  - txn.appArgs:', (txn as any).appArgs?.length)

    // CHECK THE CORRECT LOCATION: applicationCall field
    console.log('📋 Debug - ApplicationCall field verification:')
    const appCall = (txn as any).applicationCall
    if (appCall) {
      console.log('  - applicationCall exists:', !!appCall)
      console.log('  - applicationCall.appIndex:', appCall.appIndex)
      console.log('  - applicationCall.appArgs:', appCall.appArgs?.length || 'undefined')
      console.log('  - applicationCall.onComplete:', appCall.onComplete)
      console.log('  - applicationCall keys:', Object.keys(appCall))
      if (appCall.appArgs && appCall.appArgs.length > 0) {
        console.log('  - First arg in applicationCall:', Buffer.from(appCall.appArgs[0]).toString())
      }
    } else {
      console.log('  - applicationCall field is missing!')
    }

    console.log('  - Full transaction object keys:', Object.keys(txn as any))

    return txn
  } catch (txnError) {
    console.error('📋 Debug - Transaction creation FAILED:', txnError)
    throw txnError
  }
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
  try {
    // İlk yöntem: algosdk.encodeUnsignedTransaction kullan
    const encoded = algosdk.encodeUnsignedTransaction(txn)
    return Buffer.from(encoded).toString('base64')
  } catch (error) {
    console.warn('algosdk.encodeUnsignedTransaction failed, trying alternative...', error)
    try {
      // Alternatif yöntem: transaction nesnesini doğrudan JSON'a çevir
      const txnObj = (txn as any).get_obj_for_encoding ? (txn as any).get_obj_for_encoding() : txn
      const encoded = algosdk.encodeObj(txnObj)
      return Buffer.from(encoded).toString('base64')
    } catch (error2) {
      console.error('All encoding methods failed:', error2)
      throw new Error('Failed to encode transaction for signing')
    }
  }
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
    console.log('📏 Global state length:', globalState.length)

    // CRITICAL DEBUG: Log all keys to understand the real pattern (COMPACT VERSION)
    console.log('🔍 DEBUG - ALL GLOBAL STATE KEYS (COMPACT):')
    const allKeys: string[] = []
    globalState.forEach((item: any, index: number) => {
      const key = Buffer.from(item.key, 'base64').toString()
      allKeys.push(key)
    })
    console.log('📋 All keys found:', allKeys)

    // Group keys by prefix to understand pattern
    const projectKeys = allKeys.filter(k => k.startsWith('p_'))
    console.log('🎯 Project-related keys:', projectKeys)    // Extract project count first
    const projectCountState = globalState.find((item: any) =>
      Buffer.from(item.key, 'base64').toString() === 'project_count'
    )
    const projectCount = projectCountState ? Number(projectCountState.value.uint) : 0
    console.log('📊 Project count found:', projectCount, typeof projectCount)

    // If no projects, return early
    if (projectCount === 0) {
      console.log('⚠️ No projects found - returning empty array')
      return []
    }

    console.log('🔧 FIXED - Now parsing real blockchain data instead of mock data')

    // Parse real project data from global state
    const projects: any[] = []

    for (let i = 0; i < projectCount; i++) {
      console.log(`🔍 Parsing project ${i}...`)

      // Create the binary key pattern - smart contract uses 8-byte integers
      // Convert project ID to 8-byte buffer for key matching
      const projectIdBuffer = Buffer.alloc(8)
      projectIdBuffer.writeUInt32BE(0, 0) // High 32 bits = 0
      projectIdBuffer.writeUInt32BE(i, 4) // Low 32 bits = project ID

      // Create expected key patterns with binary project ID
      const nameKey = `p_${projectIdBuffer.toString()}_name`
      const descKey = `p_${projectIdBuffer.toString()}_desc`
      const targetKey = `p_${projectIdBuffer.toString()}_target`
      const deadlineKey = `p_${projectIdBuffer.toString()}_deadline`
      const categoryKey = `p_${projectIdBuffer.toString()}_category`
      const creatorKey = `p_${projectIdBuffer.toString()}_creator`
      const collectedKey = `p_${projectIdBuffer.toString()}_collected`
      const activeKey = `p_${projectIdBuffer.toString()}_active`

      console.log(`  Looking for keys with binary ID: project ${i} -> buffer pattern`)
      console.log(`  🔍 Expected name key: "${nameKey}"`)
      console.log(`  🔍 Expected desc key: "${descKey}"`)
      console.log(`  🔍 Expected target key: "${targetKey}"`)

      // Extract data from global state - match binary keys
      const nameState = globalState.find((item: any) =>
        Buffer.from(item.key, 'base64').toString() === nameKey
      )
      const descState = globalState.find((item: any) =>
        Buffer.from(item.key, 'base64').toString() === descKey
      )
      const targetState = globalState.find((item: any) =>
        Buffer.from(item.key, 'base64').toString() === targetKey
      )
      const deadlineState = globalState.find((item: any) =>
        Buffer.from(item.key, 'base64').toString() === deadlineKey
      )
      const categoryState = globalState.find((item: any) =>
        Buffer.from(item.key, 'base64').toString() === categoryKey
      )
      const creatorState = globalState.find((item: any) =>
        Buffer.from(item.key, 'base64').toString() === creatorKey
      )
      const collectedState = globalState.find((item: any) =>
        Buffer.from(item.key, 'base64').toString() === collectedKey
      )
      const activeState = globalState.find((item: any) =>
        Buffer.from(item.key, 'base64').toString() === activeKey
      )

      // Only add project if we have essential data (name and target are minimum)
      if (nameState && targetState) {
        const project = {
          id: i,
          name: nameState.value.bytes ? Buffer.from(nameState.value.bytes, 'base64').toString() : `Project ${i}`,
          description: descState?.value.bytes ? Buffer.from(descState.value.bytes, 'base64').toString() : `Description for project ${i}`,
          creator: creatorState?.value.bytes ? Buffer.from(creatorState.value.bytes, 'base64').toString() : 'Unknown Creator',
          targetAmount: Number(targetState.value.uint || BigInt(1000000000)),
          deadline: Number(deadlineState?.value.uint || BigInt(Math.floor(Date.now() / 1000) + 86400 * 30)),
          collectedAmount: Number(collectedState?.value.uint || BigInt(0)),
          category: categoryState?.value.bytes ? Buffer.from(categoryState.value.bytes, 'base64').toString() : 'General',
          threshold: 0, // This contract doesn't use threshold
          active: activeState?.value.uint === BigInt(1)
        }

        console.log(`  ✅ Project ${i} parsed:`, project)
        projects.push(project)
      } else {
        console.log(`  ⚠️ Project ${i} missing essential data, skipping`)
        console.log(`    nameState:`, !!nameState, nameState?.value)
        console.log(`    descState:`, !!descState, descState?.value)
        console.log(`    targetState:`, !!targetState, targetState?.value)
      }
    }

    console.log('✅ Real projects parsed from blockchain:', projects)
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

// Build opt-in transaction for the app
export const buildOptInTxn = async (
  client: algosdk.Algodv2,
  sender: string,
  appId: number
): Promise<algosdk.Transaction> => {
  console.log('🔗 Building opt-in transaction for user:', sender, 'to app:', appId)

  if (!sender) throw new Error('Address must not be null or undefined')
  const normalizedSender = String(sender).replace(/[^\x20-\x7E]/g, '').trim()
  if (!algosdk.isValidAddress(normalizedSender)) {
    throw new Error(`Invalid Algorand address: ${normalizedSender}`)
  }

  const params = await client.getTransactionParams().do()

  return algosdk.makeApplicationCallTxnFromObject({
    sender: normalizedSender,
    appIndex: appId,
    onComplete: algosdk.OnApplicationComplete.OptInOC,
    suggestedParams: params
  })
}

// Opt user into the app
export const optInToApp = async (
  client: algosdk.Algodv2,
  appId: number,
  sender: string,
  peraWallet: any
): Promise<string> => {
  try {
    console.log('🔗 Opting user into app:', appId)

    const optInTxn = await buildOptInTxn(client, sender, appId)

    console.log('📝 Signing opt-in transaction with Pera Wallet...')

    let signedTxns: any
    try {
      // First try base64 format (like create project)
      const txnBytes = toPeraTxnBase64(optInTxn)
      signedTxns = await peraWallet.signTransaction([[{ txn: txnBytes }]])
    } catch (error) {
      console.warn('Base64 signing failed, trying object format...', error)
      // Fallback to object format
      const txnObj = (optInTxn as any)?.get_obj_for_encoding
        ? (optInTxn as any).get_obj_for_encoding()
        : (optInTxn as any)
      signedTxns = await peraWallet.signTransaction([[{ txn: txnObj }]])
    }

    console.log('✅ Opt-in transaction signed, signedTxns:', signedTxns)

    const txId = await submitSignedTransaction(client, signedTxns)

    console.log('🎉 Successfully opted in to app! Transaction ID:', txId)
    return txId
  } catch (error) {
    console.error('❌ Error opting in to app:', error)
    throw error
  }
}

// Build unsigned NFT mint transaction for wallet signing
export const buildMintNFTTxn = async (
  client: algosdk.Algodv2,
  sender: string,
  appId: number,
  projectId: number
): Promise<algosdk.Transaction> => {
  if (!sender) throw new Error('Address must not be null or undefined')
  const normalizedSender = String(sender).replace(/[^\x20-\x7E]/g, '').trim()
  if (!algosdk.isValidAddress(normalizedSender)) {
    throw new Error(`Invalid Algorand address: ${normalizedSender}`)
  }

  const params = await client.getTransactionParams().do()
  const appArgs = [enc.encode('mint_nft'), algosdk.encodeUint64(projectId)]

  return algosdk.makeApplicationCallTxnFromObject({
    sender: normalizedSender,
    appIndex: appId,
    appArgs,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params
  })
}

// Get user's NFTs from local state
export const getUserNFTs = async (client: algosdk.Algodv2, appId: number, userAddress: string) => {
  try {
    const accountInfo = await client.accountInformation(userAddress).do()
    const localStates = (accountInfo as any)['apps-local-state'] || accountInfo.appsLocalState || []

    const appState = localStates.find((state: any) => state.id === appId)
    if (!appState) return []

    const keyValuePairs = appState['key-value'] || []
    const nfts: any[] = []

    // Get project data to match NFT project names
    const projects = await getProjects(client, appId)

    for (const kvp of keyValuePairs) {
      const keyBytes = Buffer.from(kvp.key, 'base64')
      const key = keyBytes.toString()

      // Look for NFT keys (nft_<projectId>)
      if (key.startsWith('nft_') && kvp.value.uint > 0) {
        const projectId = parseInt(key.split('_')[1])
        const assetId = kvp.value.uint

        // Find matching project
        const project = projects.find((p: any) => p.id === projectId)

        if (project) {
          // Get contribution amount
          const contribKey = `contrib_${projectId}`
          const contribKvp = keyValuePairs.find((k: any) =>
            Buffer.from(k.key, 'base64').toString() === contribKey
          )
          const contributionAmount = contribKvp ? contribKvp.value.uint : 0

          nfts.push({
            assetId,
            name: `Reward NFT - ${project.name}`,
            projectName: project.name,
            contributionAmount,
            projectId,
            url: `ipfs://reward-${projectId}-${userAddress}`
          })
        }
      }
    }

    return nfts
  } catch (error) {
    console.error('Error fetching user NFTs:', error)
    return []
  }
}

// Check if user is eligible for NFT
export const checkNFTEligibility = async (
  client: algosdk.Algodv2,
  appId: number,
  userAddress: string,
  projectId: number
): Promise<{ eligible: boolean, contributionAmount: number, alreadyMinted: boolean }> => {
  try {
    console.log(`🔍 Checking NFT eligibility for user ${userAddress} on project ${projectId}`)
    const accountInfo = await client.accountInformation(userAddress).do()
    console.log('👤 Account info received:', accountInfo)

    const localStates = (accountInfo as any)['apps-local-state'] || accountInfo.appsLocalState || []
    console.log('📱 Local states count:', localStates.length)

    const appState = localStates.find((state: any) => state.id === appId)
    if (!appState) {
      console.log(`❌ No app state found for appId ${appId}`)
      return { eligible: false, contributionAmount: 0, alreadyMinted: false }
    }

    console.log('✅ App state found:', appState)
    const keyValuePairs = appState['key-value'] || []
    console.log('🔑 Key-value pairs:', keyValuePairs.length)

    // Debug: Log all keys
    keyValuePairs.forEach((kvp: any, index: number) => {
      const key = Buffer.from(kvp.key, 'base64').toString()
      const value = kvp.value.uint || kvp.value.bytes
      console.log(`  Key ${index}: "${key}" = ${value}`)
    })

    // Check contribution amount
    const contribKey = `contrib_${projectId}`
    console.log(`🔍 Looking for contribution key: "${contribKey}"`)
    const contribKvp = keyValuePairs.find((kvp: any) =>
      Buffer.from(kvp.key, 'base64').toString() === contribKey
    )
    const contributionAmount = contribKvp ? contribKvp.value.uint : 0
    console.log(`💰 Contribution amount found: ${contributionAmount} microAlgos (${contributionAmount / 1000000} ALGO)`)

    // Check if already minted
    const nftKey = `nft_${projectId}`
    console.log(`🔍 Looking for NFT key: "${nftKey}"`)
    const nftKvp = keyValuePairs.find((kvp: any) =>
      Buffer.from(kvp.key, 'base64').toString() === nftKey
    )
    const alreadyMinted = nftKvp ? nftKvp.value.uint > 0 : false
    console.log(`🎨 Already minted: ${alreadyMinted}`)

    // Minimum 10 ALGO (10,000,000 microAlgos) for NFT eligibility
    const eligible = contributionAmount >= 10000000 && !alreadyMinted
    console.log(`🎯 Final eligibility result:`, {
      eligible,
      contributionAmount,
      alreadyMinted,
      meetsThreshold: contributionAmount >= 10000000,
      threshold: 10000000
    })

    return { eligible, contributionAmount, alreadyMinted }
  } catch (error) {
    console.error('❌ Error checking NFT eligibility:', error)
    return { eligible: false, contributionAmount: 0, alreadyMinted: false }
  }
}

// Check if user is opted into the app
export const isUserOptedIn = async (
  client: algosdk.Algodv2,
  userAddress: string,
  appId: number
): Promise<boolean> => {
  try {
    console.log('🔍 Checking opt-in status for address:', userAddress, 'app:', appId)
    const accountInfo = await client.accountInformation(userAddress).do()
    console.log('👤 Account info retrieved')

    const localStates = (accountInfo as any)['apps-local-state'] || accountInfo.appsLocalState || []
    console.log('📱 Local states found:', localStates.length)

    // Log all app IDs for debugging - convert to numbers for comparison
    const appIds = localStates.map((state: any) => {
      const id = Number(state.id)
      console.log('📱 Found app ID:', id, '(type:', typeof id, ')')
      return id
    })
    console.log('📱 User opted into apps:', appIds)
    console.log('🎯 Looking for app ID:', appId, '(type:', typeof appId, ')')

    // Use Number() to ensure type consistency
    const isOptedIn = localStates.some((state: any) => Number(state.id) === Number(appId))
    console.log(`✅ User opted in to app ${appId}:`, isOptedIn)

    return isOptedIn
  } catch (error) {
    console.error('❌ Error checking opt-in status:', error)
    return false
  }
}

// Ensure user is opted in before contributing
export const ensureOptedIn = async (
  client: algosdk.Algodv2,
  userAddress: string,
  appId: number,
  peraWallet: any,
  cachedOptedIn?: boolean | null
): Promise<boolean> => {
  console.log('🔍 Checking if user is opted in to app:', appId)

  // Use cached value if available, otherwise check blockchain
  let isOptedIn = cachedOptedIn
  if (isOptedIn === null || isOptedIn === undefined) {
    console.log('📡 No cached opt-in status, checking blockchain...')
    isOptedIn = await isUserOptedIn(client, userAddress, appId)
  } else {
    console.log('💾 Using cached opt-in status:', isOptedIn)
  }

  if (!isOptedIn) {
    console.log('❌ User not opted in, initiating opt-in process')

    try {
      // If user is already opted in, this will fail with "already opted in" error
      await optInToApp(client, appId, userAddress, peraWallet)
      console.log('✅ User successfully opted in to app')
      return true // Successfully opted in
    } catch (error: any) {
      const errorMsg = error?.message || ''
      console.log('🔍 Opt-in attempt resulted in error:', errorMsg)

      // Check if the error is because user is already opted in
      if (errorMsg.includes('has already opted in to app') || errorMsg.includes('already opted in')) {
        console.log('✅ User was already opted in (blockchain confirmed)')
        return true // User is opted in
      }

      // If it's a different error, throw it
      console.error('❌ Unexpected opt-in error:', error)
      throw error
    }
  } else {
    console.log('✅ User already opted in to app (cache/local state confirmed)')
    return true // User is opted in
  }
}
