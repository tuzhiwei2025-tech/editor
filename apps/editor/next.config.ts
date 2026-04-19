import type { NextConfig } from 'next'

/** 开发时 `/items/*` 在本地 `public` 无对应文件时，回源到官方 CDN，与本地覆盖模型共存 */
const ITEMS_FALLBACK_CDN =
  process.env.NEXT_PUBLIC_ITEMS_FALLBACK_CDN?.replace(/\/$/, '') || 'https://editor.pascal.app'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['three', '@pascal-app/viewer', '@pascal-app/core', '@pascal-app/editor'],
  turbopack: {
    resolveAlias: {
      react: './node_modules/react',
      three: './node_modules/three',
      '@react-three/fiber': './node_modules/@react-three/fiber',
      '@react-three/drei': './node_modules/@react-three/drei',
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  images: {
    unoptimized: process.env.NEXT_PUBLIC_ASSETS_CDN_URL?.startsWith('http://localhost') ?? false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  /**
   * 仅在「没有匹配到 public 静态文件 / 页面路由」时生效：
   * 本地有的 `public/items/...` 仍直接走磁盘；缺的再走 CDN，实现与官方物品库共存。
   */
  async rewrites() {
    return {
      fallback: [
        {
          source: '/items/:path*',
          destination: `${ITEMS_FALLBACK_CDN}/items/:path*`,
        },
      ],
    }
  },
}

export default nextConfig
