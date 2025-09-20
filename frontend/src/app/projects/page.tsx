'use client'

import { ProjectList } from '@/components/ProjectList'

export default function Projects() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">All Projects</h1>
        <p className="text-lg text-gray-600">
          Discover and support innovative projects on the Algorand blockchain
        </p>
      </div>
      
      <ProjectList />
    </div>
  )
}
