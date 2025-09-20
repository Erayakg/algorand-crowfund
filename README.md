# Algorand Crowdfunding Platform with NFT Rewards

A full-stack decentralized application (dApp) built on Algorand Testnet that enables users to create crowdfunding campaigns, contribute ALGO tokens, and receive exclusive NFT rewards for qualifying contributions.

## 🚀 Features

- **Project Creation**: Create crowdfunding campaigns with customizable targets, deadlines, and categories
- **Secure Contributions**: Contribute ALGO tokens to projects with escrow protection
- **NFT Rewards**: Earn exclusive reward NFTs when contributing above the threshold amount
- **Automatic Refunds**: Get automatic refunds if projects fail to reach their funding goals
- **Fund Withdrawal**: Project creators can withdraw funds once targets are met
- **Wallet Integration**: Seamless integration with Pera Wallet for Algorand transactions
- **Real-time Updates**: Live progress tracking and deadline countdowns

## 🏗️ Architecture

### Smart Contract (PyTeal)
- **Global State**: Project count, project data (name, description, creator, target, deadline, collected amount, category, threshold)
- **Local State**: Contributor amounts, NFT minting status
- **Methods**: 
  - `create_project`: Create new crowdfunding campaigns
  - `contribute`: Contribute ALGO tokens to projects
  - `withdraw`: Withdraw funds after successful completion
  - `refund`: Claim refunds for failed projects
  - `mint_nft`: Mint reward NFTs for qualifying contributors

### Frontend (Next.js + React + TypeScript)
- **Pages**: Home, Project Creation, Project Listing, Project Details, NFT Gallery
- **Components**: Wallet Connection, Project Cards, Contribution Forms
- **Styling**: Tailwind CSS for modern, responsive design
- **State Management**: React hooks for local state management

## 📋 Prerequisites

- Node.js (v18+ recommended)
- Python 3.9+
- Algorand Testnet account with ALGO tokens
- Pera Wallet browser extension

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd algorand-crowdfunding
```

### 2. Install Dependencies

#### Smart Contract Dependencies
```bash
pip install py-algorand-sdk pyteal
```

#### Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Compile Smart Contract
```bash
cd smart-contracts
python crowdfunding.py
```

This will generate:
- `approval.teal` - Main application logic
- `clear.teal` - Clear state program

### 4. Deploy Smart Contract

#### Get Testnet ALGO
1. Visit [Algorand Testnet Faucet](https://testnet.algoexplorer.io/dispenser)
2. Enter your wallet address
3. Receive test ALGO tokens

#### Deploy Contract
```bash
python test_contract.py
```

This will:
- Create test accounts
- Deploy the smart contract
- Display the Application ID

### 5. Update Configuration

Update the `APP_ID` in `frontend/src/utils/algorand.ts` with your deployed contract ID:

```typescript
export const APP_ID = YOUR_APPLICATION_ID // Replace with actual ID
```

### 6. Start Frontend Development Server
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🎯 Usage Guide

### For Project Creators

1. **Connect Wallet**: Click "Connect Pera Wallet" and authorize the connection
2. **Create Project**: Navigate to "Create Project" and fill in the details:
   - Project name and description
   - Target amount in ALGO
   - Campaign deadline
   - Category selection
   - NFT reward threshold
3. **Monitor Progress**: Track contributions and progress on your project page
4. **Withdraw Funds**: Once target is reached and deadline passes, withdraw collected funds

### For Contributors

1. **Browse Projects**: Explore available projects on the home page or projects listing
2. **Connect Wallet**: Connect your Pera Wallet to make contributions
3. **Contribute**: Enter contribution amount and confirm the transaction
4. **Earn Rewards**: If you contribute above the threshold, you'll be eligible for NFT rewards
5. **Claim NFTs**: After project completion, mint your exclusive reward NFT
6. **Get Refunds**: If a project fails, claim your refund automatically

## 🔧 Smart Contract Functions

### Create Project
```python
app_args = [
    "create_project",
    project_name,
    description,
    target_amount,
    deadline_timestamp,
    category,
    nft_threshold
]
```

### Contribute to Project
```python
# Requires 2 transactions in a group:
# 1. Payment transaction to contract address
# 2. Application call with "contribute" and project_id
```

### Withdraw Funds (Creator Only)
```python
app_args = ["withdraw", project_id]
```

### Claim Refund
```python
app_args = ["refund", project_id]
```

### Mint Reward NFT
```python
app_args = ["mint_nft", project_id]
```

## 🧪 Testing

### Smart Contract Testing
```bash
cd smart-contracts
python test_contract.py
```

### Frontend Testing
```bash
cd frontend
npm run dev
# Test wallet connection, project creation, contributions, etc.
```

## 📱 Frontend Pages

- **Home** (`/`): Project overview and wallet connection
- **Create Project** (`/create`): Form to create new crowdfunding campaigns
- **Projects** (`/projects`): Browse and filter all available projects
- **Project Details** (`/projects/[id]`): Detailed view with contribution form
- **My NFTs** (`/nfts`): View earned reward NFTs

## 🔐 Security Features

- **Escrow Protection**: Funds are held in smart contract escrow until conditions are met
- **Automatic Refunds**: Failed projects automatically enable refunds
- **Creator Verification**: Only project creators can withdraw funds
- **Threshold Validation**: NFT rewards only for qualifying contributions
- **Deadline Enforcement**: Strict deadline-based project completion

## 🌐 Network Configuration

- **Network**: Algorand Testnet
- **API Endpoint**: `https://testnet-api.algonode.cloud`
- **Explorer**: [AlgoExplorer Testnet](https://testnet.algoexplorer.io/)

## 📊 Project Structure

```
algorand-crowdfunding/
├── smart-contracts/
│   ├── crowdfunding.py          # PyTeal smart contract
│   ├── test_contract.py         # Deployment and testing script
│   ├── approval.teal           # Compiled approval program
│   └── clear.teal              # Compiled clear state program
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js app directory
│   │   ├── components/         # React components
│   │   ├── utils/              # Utility functions
│   │   └── types/              # TypeScript type definitions
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 🚀 Deployment

### Smart Contract Deployment
1. Ensure you have testnet ALGO tokens
2. Run the deployment script: `python smart-contracts/test_contract.py`
3. Note the Application ID for frontend configuration

### Frontend Deployment
1. Update `APP_ID` in `frontend/src/utils/algorand.ts`
2. Build the application: `npm run build`
3. Deploy to Vercel, Netlify, or your preferred platform

## 🔗 Important Links

- **Application ID**: `[TO_BE_UPDATED_AFTER_DEPLOYMENT]`
- **AlgoExplorer**: `https://testnet.algoexplorer.io/application/[APP_ID]`
- **Pera Wallet**: [Download Extension](https://perawallet.app/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check Algorand documentation: [Developer Portal](https://developer.algorand.org/)
- Join Algorand Discord community

## 🔮 Future Enhancements

- **Multi-token Support**: Support for other Algorand assets
- **Social Features**: Project updates and community engagement
- **Advanced Analytics**: Detailed project statistics and insights
- **Mobile App**: React Native mobile application
- **Governance**: Community voting on project categories and features

---

**Note**: This is a testnet application for educational and development purposes. Always test thoroughly before deploying to mainnet.
