import { loadAssetUrl } from '@pascal-app/core'

/**
 * 物品等资源的基础 URL（不含末尾 `/`）。
 * - 若设置了 `NEXT_PUBLIC_ASSETS_CDN_URL`（可为空字符串）：始终使用该值；空串表示同源相对路径（如 `/items/...`）。
 * - 若未设置：开发与生产均默认同源 `''`，由 Next `rewrites` 在服务端回源到官方物品库（见 apps/editor `next.config.ts`），避免在第三方域名（如 `*.vercel.app`）下浏览器直连 `editor.pascal.app` 触发跨域 `Failed to fetch`。
 * - 若需客户端始终走绝对 CDN：设置 `NEXT_PUBLIC_ASSETS_CDN_URL=https://editor.pascal.app`（末尾可无 `/`）。
 */
function assetsCdnBase(): string {
  const env = process.env.NEXT_PUBLIC_ASSETS_CDN_URL
  if (env !== undefined) {
    return env.replace(/\/$/, '')
  }
  return ''
}

export const ASSETS_CDN_URL = assetsCdnBase()

/**
 * Resolves an asset URL to the appropriate format:
 * - If URL starts with http:// or https://, return as-is (external URL)
 * - If URL starts with asset://, resolve from IndexedDB storage
 * - If URL starts with /, prepend CDN URL (absolute path)
 * - Otherwise, prepend CDN URL (relative path)
 */
export async function resolveAssetUrl(url: string | undefined | null): Promise<string | null> {
  if (!url) return null

  // External URL - use as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // IndexedDB asset - resolve from storage
  if (url.startsWith('asset://')) {
    return loadAssetUrl(url)
  }

  // Absolute or relative path - prepend CDN URL
  const normalizedPath = url.startsWith('/') ? url : `/${url}`
  return `${ASSETS_CDN_URL}${normalizedPath}`
}

/**
 * Synchronous version for URLs that don't need IndexedDB resolution
 * Only use this if you're sure the URL is not an asset:// URL
 */
export function resolveCdnUrl(url: string | undefined | null): string | null {
  if (!url) return null

  // External URL - use as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // Don't use this for asset:// URLs - use resolveAssetUrl instead
  if (url.startsWith('asset://')) {
    console.warn('Use resolveAssetUrl() for asset:// URLs, not resolveCdnUrl()')
    return null
  }

  // Absolute or relative path - prepend CDN URL
  const normalizedPath = url.startsWith('/') ? url : `/${url}`
  return `${ASSETS_CDN_URL}${normalizedPath}`
}
