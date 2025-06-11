import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { Button } from "@/src/shared/components/ui/button";
import { clsx } from "@/src/lib/clsx";

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
  const sensors = useSensors(useSensor(PointerSensor));

  const items = useMemo(
    () =>
      images.map((file, idx) => ({
        id: file.name + idx + file.lastModified,
        file,
      })),
    [images]
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newOrder = arrayMove(items, oldIndex, newIndex);
      onChange(newOrder.map((item) => item.file));
    }
  };

  return (
    <div>
      <h4 className="font-medium mb-2">{title}</h4>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {items.map((item, index) => (
              <SortableImageItem
                key={item.id}
                id={item.id}
                file={item.file}
                index={index}
                onRemove={() => onRemoveImage(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

interface SortableImageItemProps {
  id: string;
  file: File;
  index: number;
  onRemove: () => void;
}

function SortableImageItem({ id, file, onRemove }: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  };

  const previewUrl = URL.createObjectURL(file);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group"
    >
      <div
        className={clsx(
          "aspect-square bg-gray-100 rounded-lg overflow-hidden",
          isDragging
            ? "border-4 border-blue-600 shadow-lg"
            : "border-transparent"
        )}
      >
        <img
          src={previewUrl || "/placeholder.svg"}
          alt={file.name}
          className="w-full h-full object-cover"
          onLoad={() => URL.revokeObjectURL(previewUrl)}
        />
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <X className="w-3 h-3" />
      </Button>
      <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
    </div>
  );
}
