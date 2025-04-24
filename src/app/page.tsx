import UrlInput from '@/components/UrlInput';

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">웹 크롤러</h1>
        <p className="text-gray-600">크롤링할 웹사이트 URL을 입력해주세요</p>
      </header>
      <UrlInput />
    </div>
  );
}
