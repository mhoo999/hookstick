'use client';

import { Site } from '@/types/site';
import { useState, useEffect } from 'react';

interface SiteListProps {
  onSiteSelect: (sites: Site[]) => void;
  selectedSites: string[];
  onSelectedSitesChange: (siteIds: string[]) => void;
}

const DEFAULT_SITES: Site[] = [];

const STORAGE_KEY = 'crawling-sites';

const cleanUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // URL 경로에서 중복된 도메인 제거
    const path = urlObj.pathname.replace(new RegExp(`^/?${urlObj.hostname}`), '');
    return `${urlObj.origin}${path}${urlObj.search}`;
  } catch (error) {
    return url;
  }
};

export default function SiteList({ onSiteSelect, selectedSites, onSelectedSitesChange }: SiteListProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [newUrl, setNewUrl] = useState('');

  // 로컬 스토리지에서 사이트 목록 불러오기
  useEffect(() => {
    const savedSites = localStorage.getItem(STORAGE_KEY);
    if (savedSites) {
      const loadedSites = JSON.parse(savedSites);
      setSites(loadedSites);
      // 모든 사이트 ID를 선택된 상태로 설정
      onSelectedSitesChange(loadedSites.map((site: Site) => site.id));
    } else {
      setSites(DEFAULT_SITES);
      // 기본 사이트도 선택된 상태로 설정
      onSelectedSitesChange(DEFAULT_SITES.map(site => site.id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SITES));
    }
  }, [onSelectedSitesChange]);

  // 사이트 목록 저장
  const saveSites = (updatedSites: Site[]) => {
    setSites(updatedSites);
    // 저장할 때마다 모든 사이트를 선택된 상태로 설정
    onSelectedSitesChange(updatedSites.map(site => site.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSites));
  };

  const handleAddSite = () => {
    if (!newUrl) {
      alert('URL을 입력해주세요.');
      return;
    }

    try {
      const url = new URL(newUrl);
      const baseUrl = url.origin;
      const name = url.hostname.replace(/^www\./i, '');

      const site: Site = {
        id: Date.now().toString(),
        name,
        url: cleanUrl(newUrl),
        baseUrl
      };

      const updatedSites = [...sites, site];
      saveSites(updatedSites);
      // 새로 추가된 사이트를 선택 목록에 추가
      onSelectedSitesChange([...selectedSites, site.id]);
      setNewUrl('');
    } catch (error) {
      alert('올바른 URL 형식을 입력해주세요.');
    }
  };

  const handleDeleteSite = (siteId: string) => {
    const updatedSites = sites.filter(site => site.id !== siteId);
    saveSites(updatedSites);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSite();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      {sites.map((site) => (
        <div
          key={site.id}
          className={`flex flex-col p-3 border rounded-lg hover:bg-white/5 ${
            selectedSites.includes(site.id)
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-white/10'
          }`}
          onClick={() => {
            const newSelectedSites = selectedSites.includes(site.id)
              ? selectedSites.filter(id => id !== site.id)
              : [...selectedSites, site.id];
            onSelectedSitesChange(newSelectedSites);
          }}
        >
          <div className="flex justify-between items-start">
            <div
              data-site-id={site.id}
              data-url={site.url}
              data-base-url={site.baseUrl}
            >
              <h3 className="font-medium text-white/90">{site.name}</h3>
              <p className="text-sm text-white/60 break-all">{site.url}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSite(site.id);
              }}
              className="text-sm text-white/40 hover:text-white/80"
            >
              삭제
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <input
          type="url"
          placeholder="사이트 URL을 입력하세요 (예: https://example.com)"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/20"
        />
        <button
          onClick={handleAddSite}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          추가
        </button>
      </div>
    </div>
  );
} 