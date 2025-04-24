'use client';

import { useState, useCallback, useEffect } from 'react';
import { Product } from '@/types/product';
import ProductList from './ProductList';
import SiteList from './SiteList';
import DayRangeSlider from './DayRangeSlider';
import { Site } from '@/types/site';

const DEFAULT_SITE: Site = {
  id: 'outofline',
  name: 'Out of Line',
  url: 'https://outofline.co.kr/product/list.html?cate_no=24',
  baseUrl: 'https://outofline.co.kr'
};

const STORAGE_KEY = 'crawling-sites';

export default function UrlInput() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [daysToSearch, setDaysToSearch] = useState(7);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [isSiteListOpen, setIsSiteListOpen] = useState(false);

  // 페이지 로드 시 사이트 목록 가져오기
  useEffect(() => {
    const savedSites = localStorage.getItem(STORAGE_KEY);
    if (savedSites) {
      try {
        const loadedSites = JSON.parse(savedSites);
        if (Array.isArray(loadedSites) && loadedSites.length > 0) {
          setSelectedSites(loadedSites.map(site => site.id));
        }
      } catch (error) {
        console.error('Error loading sites:', error);
      }
    }
  }, []);

  const handleSelectedSitesChange = useCallback((siteIds: string[]) => {
    setSelectedSites(siteIds);
  }, []);

  const handleCrawlStart = async () => {
    try {
      setIsLoading(true);
      setProducts([]);
      setIsSiteListOpen(false);

      const allProducts: Product[] = [];
      const savedSites = localStorage.getItem(STORAGE_KEY);
      const sites: Site[] = savedSites ? JSON.parse(savedSites) : [DEFAULT_SITE];

      // 선택된 모든 사이트를 순차적으로 크롤링
      for (const siteId of selectedSites) {
        const site = sites.find(s => s.id === siteId);
        if (!site) continue;

        try {
          const response = await fetch('/api/crawl', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: site.url,
              daysToSearch,
              baseUrl: site.baseUrl
            }),
          });

          const responseText = await response.text();
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            console.error(`Invalid JSON response from ${site.url}:`, responseText);
            alert(`${site.name} 크롤링 실패: 서버 응답이 올바르지 않습니다.`);
            continue;
          }

          if (!response.ok) {
            console.error(`Failed to crawl ${site.url}:`, data);
            alert(`${site.name} 크롤링 실패: ${data.message || response.statusText || '서버에서 오류가 발생했습니다.'}`);
            continue;
          }

          if (!data.products || !Array.isArray(data.products)) {
            console.error(`Invalid response format from ${site.url}:`, data);
            alert(`${site.name}의 응답 형식이 올바르지 않습니다.`);
            continue;
          }

          console.log(`Successfully crawled ${site.name}:`, data.products.length, 'products found');
          allProducts.push(...data.products);
        } catch (error) {
          console.error(`Error crawling ${site.url}:`, error);
          alert(`${site.name} 크롤링 중 오류 발생: ${error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.'}`);
        }
      }

      // 모든 상품을 날짜순으로 정렬
      allProducts.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });

      setProducts(allProducts);
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : '크롤링 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold text-white">HOOKSTICK</h1>

      <div className="space-y-4">
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsSiteListOpen(!isSiteListOpen)}
              className="px-4 py-2 text-white border border-white/20 rounded-lg hover:bg-white/10 flex items-center justify-center gap-2"
            >
              <span>{isSiteListOpen ? '사이트 목록 닫기' : '사이트 목록 관리'}</span>
              <svg
                className={`w-4 h-4 transition-transform ${isSiteListOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {isSiteListOpen && (
            <div className="border border-white/10 rounded-lg p-6">
              <SiteList
                onSiteSelect={() => {}}
                selectedSites={selectedSites}
                onSelectedSitesChange={handleSelectedSitesChange}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="w-64">
            <DayRangeSlider value={daysToSearch} onChange={setDaysToSearch} />
          </div>
          <button
            onClick={handleCrawlStart}
            disabled={isLoading || selectedSites.length === 0}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {selectedSites.length}개 사이트 탐색 시작
          </button>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
        <ProductList products={products} isLoading={isLoading} />
      </div>
    </div>
  );
} 