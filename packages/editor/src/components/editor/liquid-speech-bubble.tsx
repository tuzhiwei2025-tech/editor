'use client'

import clsx from 'clsx'

export type LiquidSpeechBubbleProps = {
  variant?: 'employee' | 'gogo'
  headline?: string
  body: string
  footer?: string
  className?: string
}

export function LiquidSpeechBubble({
  variant = 'employee',
  headline,
  body,
  footer,
  className,
}: LiquidSpeechBubbleProps) {
  const isGogo = variant === 'gogo'
  return (
    <div
      className={clsx(
        'lsb-root',
        isGogo && 'lsb-root--gogo',
        isGogo && !headline && !footer && 'lsb-gogo-only',
        className,
      )}
    >
      {headline ? <div className="lsb-headline">{headline}</div> : null}
      <div className="lsb-body">{body}</div>
      {footer ? <div className="lsb-footer">{footer}</div> : null}
      <div aria-hidden className="lsb-tail" />
    </div>
  )
}
