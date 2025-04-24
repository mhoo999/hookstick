"use client"

import { Slider } from "@/components/ui/slider"

interface ProductCountSliderProps {
  value: number;
  onChange: (count: number) => void;
}

export default function ProductCountSlider({ value, onChange }: ProductCountSliderProps) {
  return (
    <div className="flex items-center space-x-2 h-10">
      <div className="w-[200px]">
        <Slider
          defaultValue={[10]}
          value={[value]}
          min={5}
          max={20}
          step={5}
          onValueChange={(values) => onChange(values[0])}
          className="w-full"
        />
      </div>
      <span className="text-sm text-white/60 whitespace-nowrap min-w-[80px]">
        {value}개씩 보기
      </span>
    </div>
  );
} 