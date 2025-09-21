import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rise - Decentralized Crowdfunding Platform',
  description: 'Fund innovative projects, earn exclusive NFT rewards, and be part of the future of decentralized crowdfunding on Algorand blockchain',
  keywords: 'crowdfunding, blockchain, Algorand, NFT, decentralized, funding, projects',
  authors: [{ name: 'Rise Platform' }],
  openGraph: {
    title: 'Rise - Decentralized Crowdfunding Platform',
    description: 'Fund innovative projects, earn exclusive NFT rewards, and be part of the future of decentralized crowdfunding',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          {/* Header */}
          <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">
                {/* Logo & Brand */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">R</span>
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-500 to-red-500 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Rise
                      </h1>
                      <p className="text-xs text-white/60 font-medium">Crowdfunding Platform</p>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="hidden md:flex items-center space-x-1">
                  <a
                    href="/"
                    className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-all duration-200"
                  >
                    Home
                  </a>
                  <a
                    href="/projects"
                    className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-all duration-200"
                  >
                    Projects
                  </a>
                  <a
                    href="/create"
                    className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-all duration-200"
                  >
                    Create
                  </a>
                  <a
                    href="/nfts"
                    className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-all duration-200"
                  >
                    My NFTs
                  </a>
                </nav>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                  <button className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="relative">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-black/20 backdrop-blur-md border-t border-white/10 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <span className="text-xl font-bold text-white">R</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Rise</h3>
                      <p className="text-sm text-white/60">Crowdfunding Platform</p>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed max-w-md">
                    The future of decentralized crowdfunding. Fund innovative projects, earn exclusive NFT rewards, and be part of the blockchain revolution.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-white font-semibold mb-4">Platform</h4>
                  <ul className="space-y-2">
                    <li><a href="/" className="text-white/70 hover:text-white text-sm transition-colors">Home</a></li>
                    <li><a href="/projects" className="text-white/70 hover:text-white text-sm transition-colors">Projects</a></li>
                    <li><a href="/create" className="text-white/70 hover:text-white text-sm transition-colors">Create Project</a></li>
                    <li><a href="/nfts" className="text-white/70 hover:text-white text-sm transition-colors">My NFTs</a></li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-white font-semibold mb-4">Technology</h4>
                  <ul className="space-y-2">
                    <li><span className="text-white/70 text-sm">Built on Algorand</span></li>
                    <li><span className="text-white/70 text-sm">Smart Contracts</span></li>
                    <li><span className="text-white/70 text-sm">NFT Rewards</span></li>
                    <li><span className="text-white/70 text-sm">Decentralized</span></li>
                  </ul>
                </div>
              </div>
              
              <div className="border-t border-white/10 mt-8 pt-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <p className="text-white/60 text-sm">
                    © 2024 Rise Platform. All rights reserved.
                  </p>
                  <div className="flex items-center space-x-4 mt-4 md:mt-0">
                    <span className="text-white/60 text-sm">Powered by</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                      <span className="text-white font-semibold text-sm">Algorand</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
