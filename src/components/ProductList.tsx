'use client';

import { Product } from '@/types/product';
import Image from 'next/image';

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
}

export default function ProductList({ products, isLoading }: ProductListProps) {
  if (isLoading) {
    return (
      <div className="w-full text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600">상품 찾는 중...</p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="w-full text-center py-8 text-gray-600">
        탐색된 상품이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product, index) => (
        <a 
          key={index} 
          href={product.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 bg-white"
        >
          <div className="relative h-48">
            <Image
              src={product.thumbnail}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-4 space-y-2 bg-white">
            <h3 className="font-bold text-black text-lg leading-snug line-clamp-2 min-h-[3.5rem]">
              {product.name}
            </h3>
            <p className="text-gray-700 font-medium">
              {product.price.split(' ')[0]}
            </p>
            <p className="text-sm text-gray-500">
              출처: Out of Line
            </p>
          </div>
        </a>
      ))}
    </div>
  );
} 