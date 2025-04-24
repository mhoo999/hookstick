'use client';

import { Product } from '@/types/product';
import Image from 'next/image';
import { useEffect, useRef } from 'react';

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
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

export default function ProductList({ products, isLoading, hasMore, onLoadMore }: ProductListProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  if (isLoading && !products.length) {
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product, index) => (
          <a 
            key={index} 
            href={product.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block overflow-hidden transition-all duration-200 hover:-translate-y-1 bg-white rounded-lg"
          >
            <div className="relative aspect-square">
              <Image
                src={product.thumbnail}
                alt="상품 이미지"
                fill
                className="object-cover"
              />
            </div>
            <div className="p-2 space-y-1">
              <p className="text-sm font-medium text-gray-900 text-center">
                {product.price ? formatPrice(product.price) : ''}
              </p>
              <p className="text-xs text-gray-600 text-center">
                {extractStoreName(product.url)}
              </p>
            </div>
          </a>
        ))}
      </div>
      
      {hasMore && (
        <div ref={loadMoreRef} className="w-full text-center py-4">
          {isLoading ? (
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          ) : null}
        </div>
      )}
    </div>
  );
} 