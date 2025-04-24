'use client';

import { useState } from 'react';
import { Product } from '@/types/product';
import ProductList from './ProductList';

export default function UrlInput() {
  const [url, setUrl] = useState('');
  const [urlList, setUrlList] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setUrlList([...urlList, url]);
    await crawlWebsite(url);
    setUrl('');
  };

  const crawlWebsite = async (targetUrl: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '크롤링에 실패했습니다.');
      }

      setProducts(data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : '크롤링 중 오류가 발생했습니다.');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (indexToDelete: number) => {
    setUrlList(urlList.filter((_, index) => index !== indexToDelete));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="크롤링할 웹사이트 URL을 입력하세요"
          className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          크롤링
        </button>
      </form>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">크롤링 URL 목록</h2>
        <ul className="space-y-2">
          {urlList.map((savedUrl, index) => (
            <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
              <span className="truncate">{savedUrl}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => crawlWebsite(savedUrl)}
                  className="px-3 py-1 text-blue-500 hover:text-blue-700"
                >
                  재크롤링
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  className="px-3 py-1 text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ProductList products={products} isLoading={isLoading} />
    </div>
  );
} 