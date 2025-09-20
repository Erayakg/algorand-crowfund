export interface Project {
  id: number
  name: string
  description: string
  creator: string
  targetAmount: number
  deadline: number
  collectedAmount: number
  category: string
  threshold: number
  active: boolean
}

export interface Contribution {
  projectId: number
  amount: number
  contributor: string
  timestamp: number
}

export interface NFT {
  assetId: number
  name: string
  projectName: string
  contributionAmount: number
  url: string
}

export interface WalletState {
  connected: boolean
  address: string | null
  balance: number
}

export interface AppState {
  wallet: WalletState
  projects: Project[]
  contributions: Contribution[]
  nfts: NFT[]
  loading: boolean
  error: string | null
}
