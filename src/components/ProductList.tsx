'use client';

import { Product } from '@/types/product';
import Image from 'next/image';

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
}

// URL에서 도메인 이름 추출 함수
function extractStoreName(url: string): string {
  try {
    const domain = new URL(url).hostname;
    // 'm.' 또는 'www.' 제거
    const cleanDomain = domain.replace(/^(m\.|www\.)/, '');
    // '.co.kr' 또는 '.com' 등 제거
    const storeName = cleanDomain.split('.')[0];
    // 첫 글자를 대문자로
    return storeName.charAt(0).toUpperCase() + storeName.slice(1);
  } catch {
    return '알 수 없음';
  }
}

// 가격 포맷팅 함수
function formatPrice(price: string | undefined): string {
  if (!price) return '';
  const numStr = price.replace(/[^0-9]/g, '');
  if (!numStr) return '';
  return `${Number(numStr).toLocaleString()}원`;
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
          <div className="relative aspect-square">
            <Image
              src={product.thumbnail}
              alt="상품 이미지"
              fill
              className="object-cover"
            />
          </div>
          <div className="p-2 bg-white space-y-1">
            <p className="text-sm font-medium text-gray-700 text-center">
              {product.price ? formatPrice(product.price) : ''}
            </p>
            <p className="text-xs text-gray-500 text-center">
              {extractStoreName(product.url)}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
} 