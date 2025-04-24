'use client';

interface DayRangeSliderProps {
  value: number;
  onChange: (days: number) => void;
}

export default function DayRangeSlider({ value, onChange }: DayRangeSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">
          크롤링 기간 설정
        </label>
        <span className="text-sm text-gray-500">
          {value}일 전부터 현재까지
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="30"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>1일</span>
        <span>15일</span>
        <span>30일</span>
      </div>
    </div>
  );
} 