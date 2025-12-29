'use client'

import { useRef } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onChange: (files: File[]) => void
  accept?: string
  disabled?: boolean
  multiple?: boolean
  className?: string
}

export function FileUpload({
  onChange,
  accept = "image/*,video/*,application/*",
  disabled = false,
  multiple = false,
  className
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    onChange(Array.from(files))

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className={cn(
          "w-full h-32 border-2 border-dashed border-white/20 rounded-lg",
          "flex flex-col items-center justify-center gap-2",
          "hover:border-red-500 hover:bg-white/5 transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "text-white/60 hover:text-white"
        )}
      >
        {disabled ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8" />
            <span className="text-sm">Click to upload or drag and drop</span>
            <span className="text-xs text-white/40">
              {accept.includes('image') && 'Images, '}
              {accept.includes('video') && 'Videos, '}
              {accept.includes('application') && 'Documents'}
            </span>
          </>
        )}
      </button>
    </div>
  )
}
