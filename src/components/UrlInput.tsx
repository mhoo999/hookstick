'use client';

import { useState, useCallback, useEffect } from 'react';
import { Product } from '@/types/product';
import ProductList from './ProductList';
import SiteList from './SiteList';
import { Site } from '@/types/site';
import ProductCountSlider from './ProductCountSlider';

const STORAGE_KEY = 'crawling-sites';

export default function UrlInput() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [isSiteListOpen, setIsSiteListOpen] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [productCount, setProductCount] = useState(10);

  // 페이지 로드 시 사이트 목록 가져오기
  useEffect(() => {
    const savedSites = localStorage.getItem(STORAGE_KEY);
    if (savedSites) {
      try {
        const loadedSites = JSON.parse(savedSites);
        if (Array.isArray(loadedSites) && loadedSites.length > 0) {
          setSelectedSites(loadedSites.map(site => site.id));
          setSites(loadedSites);
        }
      } catch (error) {
        console.error('Error loading sites:', error);
      }
    }
  }, []);

  const handleSelectedSitesChange = useCallback((siteIds: string[]) => {
    setSelectedSites(siteIds);
  }, []);

  const handleSiteSelect = useCallback((selectedSites: Site[]) => {
    setSites(selectedSites);
  }, []);

  const handleShareSites = useCallback(() => {
    const savedSites = localStorage.getItem(STORAGE_KEY);
    if (savedSites) {
      const sites = JSON.parse(savedSites);
      const selectedSitesData = sites.filter((site: Site) => selectedSites.includes(site.id));
      const shareUrl = `${window.location.origin}?sites=${encodeURIComponent(JSON.stringify(selectedSitesData))}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 2000);
      });
    }
  }, [selectedSites]);

  const handleDeleteAllSites = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSelectedSites([]);
    setSites([]);
    // 빈 배열을 저장하여 SiteList 컴포넌트의 리렌더링 트리거
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    // storage 이벤트 발생
    window.dispatchEvent(new Event('storage'));
  }, []);

  const handleCrawlStart = async () => {
    try {
      setIsLoading(true);
      setProducts([]);
      setIsSiteListOpen(false);

      const allProducts: Product[] = [];
      const savedSites = localStorage.getItem(STORAGE_KEY);
      const sites: Site[] = savedSites ? JSON.parse(savedSites) : [];

      // 선택된 모든 사이트를 순차적으로 크롤링
      for (const siteId of selectedSites) {
        const site = sites.find(s => s.id === siteId);
        if (!site) continue;

        try {
          console.log(`크롤링 시작: ${site.name} (${site.url})`);
          
          const response = await fetch('/api/crawl', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: site.url,
              baseUrl: site.baseUrl,
              limit: productCount
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || response.statusText);
          }

          const responseText = await response.text();
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            console.error(`응답 데이터 파싱 실패:`, responseText);
            throw new Error(`${site.name}: 서버 응답이 올바르지 않습니다.`);
          }

          if (!data.products || !Array.isArray(data.products)) {
            console.error(`잘못된 응답 형식:`, data);
            throw new Error(`${site.name}: 응답 형식이 올바르지 않습니다.`);
          }

          console.log(`크롤링 완료: ${site.name}, ${data.products.length}개 상품 발견`);
          allProducts.push(...data.products);
        } catch (error) {
          console.error(`${site.name} 크롤링 실패:`, error);
          alert(`${site.name} 크롤링 실패: ${error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}`);
        }
      }

      setProducts(allProducts);
    } catch (error) {
      console.error('크롤링 오류:', error);
      alert(error instanceof Error ? error.message : '크롤링 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    // 현재는 추가 데이터를 로드하지 않음
    setHasMore(false);
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">HOOKSTICK</h1>
        <button
          onClick={() => setIsSiteListOpen(!isSiteListOpen)}
          className="px-4 py-2 text-white border border-white/20 rounded-lg hover:bg-white/10 flex items-center justify-center gap-2"
        >
          <span>사이트 목록</span>
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

      <div className="space-y-4">
        <div className="space-y-4">
          {isSiteListOpen && (
            <div className="border border-white/10 rounded-lg p-6">
              <div className="flex justify-end gap-2 mb-4">
                <button
                  onClick={handleShareSites}
                  className="px-2.5 py-1.5 text-sm text-white border border-white/20 rounded-lg hover:bg-white/10 flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  공유하기
                </button>
                <button
                  onClick={handleDeleteAllSites}
                  className="px-2.5 py-1.5 text-sm text-red-400 border border-red-400/20 rounded-lg hover:bg-red-400/10 flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  모두삭제
                </button>
              </div>
              <SiteList
                onSiteSelect={handleSiteSelect}
                selectedSites={selectedSites}
                onSelectedSitesChange={handleSelectedSitesChange}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <ProductCountSlider value={productCount} onChange={setProductCount} />
          <button
            onClick={handleCrawlStart}
            disabled={isLoading || selectedSites.length === 0}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {selectedSites.length}개 사이트 탐색 시작
          </button>
        </div>
      </div>

      <div>
        <ProductList 
          products={products} 
          isLoading={isLoading} 
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />
      </div>

      {showCopiedToast && (
        <div className="fixed bottom-4 right-4 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
          URL이 클립보드에 복사되었습니다
        </div>
      )}
    </div>
  );
} 