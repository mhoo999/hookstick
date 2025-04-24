import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function POST(request: Request) {
  const browser = await chromium.launch();

  try {
    const { url, baseUrl } = await request.json();
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const products = await page.evaluate((baseUrl: string) => {
        const items = Array.from(document.querySelectorAll('li'));
        return items
          .filter(item => {
            const img = item.querySelector('img');
            const link = item.querySelector('a');
            return img && link;
          })
          .map(item => {
            const img = item.querySelector('img');
            const link = item.querySelector('a');
            let thumbnail = img?.getAttribute('src') || '';
            const url = link?.getAttribute('href') || '';

            // 이미지 URL 정규화
            if (thumbnail) {
              console.log('Original thumbnail URL:', thumbnail);
              
              // URL에서 도메인 부분 제거
              const domainRegex = /^https?:\/\/[^\/]+/;
              thumbnail = thumbnail.replace(domainRegex, '');
              
              // 중복된 슬래시 제거
              thumbnail = thumbnail.replace(/\/+/g, '/');
              
              // 앞에 슬래시가 없는 경우 추가
              if (!thumbnail.startsWith('/')) {
                thumbnail = '/' + thumbnail;
              }
              
              // baseUrl과 경로 조합
              thumbnail = baseUrl + thumbnail;
              
              console.log('Normalized thumbnail URL:', thumbnail);
            }

            return {
              thumbnail,
              url: url.startsWith('http') ? url : `${baseUrl}${url}`
            };
          });
      }, baseUrl);

      await page.close();

      return NextResponse.json({ products });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Crawling error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await browser.close();
  }
} 