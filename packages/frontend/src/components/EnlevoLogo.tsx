import { cn } from '@/lib/utils'

interface EnlevoLogoProps {
  variant?: 'default' | 'light'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { width: 140, height: 32, fontSize: 20, hubSize: 16 },
  md: { width: 200, height: 44, fontSize: 28, hubSize: 22 },
  lg: { width: 300, height: 64, fontSize: 42, hubSize: 34 },
}

export function EnlevoLogo({ variant = 'default', size = 'md', className }: EnlevoLogoProps) {
  const s = sizeMap[size]
  const textColor = variant === 'light' ? '#ffffff' : '#21252d'
  const hubColor = '#b8a378'

  return (
    <svg
      width={s.width}
      height={s.height}
      viewBox={`0 0 ${s.width} ${s.height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      aria-label="EnlevoHub"
    >
      <text
        x="0"
        y={s.height * 0.72}
        fontFamily="'Playfair Display', Georgia, serif"
        fontWeight="300"
        fontSize={s.fontSize}
        letterSpacing={s.fontSize * 0.15}
        fill={textColor}
      >
        ENLEVO
      </text>
      <text
        x={s.width * 0.68}
        y={s.height * 0.72}
        fontFamily="'Playfair Display', Georgia, serif"
        fontWeight="700"
        fontSize={s.hubSize}
        letterSpacing={s.hubSize * 0.08}
        fill={hubColor}
      >
        HUB
      </text>
    </svg>
  )
}
