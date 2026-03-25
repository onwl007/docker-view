import type { SVGProps } from 'react'

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <rect x="6" y="6" width="36" height="36" rx="12" fill="currentColor" />
      <path
        d="M14 15h8.5c5.25 0 9.5 4.253 9.5 9.5S27.75 34 22.5 34H14V15Zm6.9 14.1c2.84 0 5.1-1.93 5.1-4.6 0-2.68-2.26-4.6-5.1-4.6h-1.2v9.2h1.2Z"
        fill="#F7FAFF"
      />
      <path
        d="M28.7 15h5.95l-5.15 19h-5.95l5.15-19Z"
        fill="#F7FAFF"
        fillOpacity="0.98"
      />
      <path
        d="M32.8 15h6.3L31.2 34h-6.3l7.9-19Z"
        fill="#DDEBFF"
        fillOpacity="0.62"
      />
    </svg>
  )
}
