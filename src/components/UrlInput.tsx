'use client';

import { useState } from 'react';

export default function UrlInput() {
  const [url, setUrl] = useState('');
  const [urlList, setUrlList] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setUrlList([...urlList, url]);
    setUrl('');
  };

  const handleDelete = (indexToDelete: number) => {
    setUrlList(urlList.filter((_, index) => index !== indexToDelete));
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
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
          추가
        </button>
      </form>

      <ul className="space-y-2">
        {urlList.map((savedUrl, index) => (
          <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
            <span className="truncate">{savedUrl}</span>
            <button
              onClick={() => handleDelete(index)}
              className="ml-2 px-2 py-1 text-red-500 hover:text-red-700"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
} 