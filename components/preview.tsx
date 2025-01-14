'use client'

import dynamic from 'next/dynamic'

import 'react-quill/dist/quill.bubble.css'

interface PreviewProps {
  value: string
}

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill')
    return function comp({ forwardedRef, ...props }: any) {
      return <RQ ref={forwardedRef} {...props} />
    }
  },
  {
    ssr: false,
    loading: () => <div className="h-20 w-full bg-slate-200 animate-pulse" />
  }
)

export const Preview = ({ value }: PreviewProps) => {
  return (
    <div className="bg-white">
      <ReactQuill theme="bubble" value={value} readOnly />
    </div>
  )
}
