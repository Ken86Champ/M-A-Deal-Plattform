import type { NextConfig } from 'next'

const config: NextConfig = {
  // Python pipeline service proxy (local dev)
  async rewrites() {
    return [
      {
        source: '/pipeline/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ]
  },
}

export default config
