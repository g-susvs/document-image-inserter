import { useMemo } from "react";
import { X } from "lucide-react";
import { ReactSortable } from "react-sortablejs";
import { Button } from "@/src/shared/components/ui/button";

interface SortableImageListProps {
  images: File[];
  onChange: (images: File[]) => void;
  title: string;
  onRemoveImage: (index: number) => void;
}

export const SortableImageList = ({
  images,
  onChange,
  title,
  onRemoveImage,
}: SortableImageListProps) => {
  const items = useMemo(
    () =>
      images.map((file, idx) => ({
        id: file.name + idx + file.lastModified,
        file,
      })),
    [images]
  );

  const generatePreview = (file: File): string => {
    return URL.createObjectURL(file);
  };

  return (
    <div>
      <h4 className="font-medium mb-2">{title}</h4>
      <ReactSortable
        list={items}
        setList={(newState) => {
          onChange(newState.map((item) => item.file));
        }}
        animation={150}
        tag="div"
        className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4"
      >
          {items.map((item, index) => {
            const image = item.file;
            const previewUrl = generatePreview(image);
            return (
              <div key={item.id} className="relative group">
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
                <p className="text-xs text-gray-600 mt-1 truncate">
                  {image.name}
                </p>
              </div>
            );
          })}
      </ReactSortable>
    </div>
  );
};
