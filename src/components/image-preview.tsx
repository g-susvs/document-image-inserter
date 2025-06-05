"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "../components/ui/button"

interface ImagePreviewProps {
  images: File[]
  onRemoveImage: (index: number) => void
}

export function ImagePreview({ images, onRemoveImage }: ImagePreviewProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  const generatePreview = (file: File): string => {
    return URL.createObjectURL(file)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
      {images.map((image, index) => {
        const previewUrl = generatePreview(image)

        return (
          <div key={index} className="relative group">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={previewUrl || "/placeholder.svg"}
                alt={image.name}
                className="w-full h-full object-cover"
                onLoad={() => URL.revokeObjectURL(previewUrl)}
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemoveImage(index)}
            >
              <X className="w-3 h-3" />
            </Button>
            <p className="text-xs text-gray-600 mt-1 truncate">{image.name}</p>
          </div>
        )
      })}
    </div>
  )
}
