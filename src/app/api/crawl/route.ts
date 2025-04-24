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
        // 상품 목록 컨테이너에서 상품 아이템 선택
        const items = Array.from(document.querySelectorAll('.prdList .xans-record-'));
        console.log('Found items:', items.length);

        return items
          .filter(item => {
            const img = item.querySelector('.prdImg img, .thumbnail img');
            const link = item.querySelector('.prdImg a, .thumbnail a');
            const name = item.querySelector('.name a, .description a');
            return img && link && name;
          })
          .map(item => {
            const img = item.querySelector('.prdImg img, .thumbnail img');
            const link = item.querySelector('.prdImg a, .thumbnail a');
            const name = item.querySelector('.name a, .description a');
            
            // data-original 속성을 우선적으로 확인하고, 없으면 src 속성 사용
            let thumbnail = img?.getAttribute('data-original') || img?.getAttribute('src') || '';
            const url = link?.getAttribute('href') || '';
            const title = name?.textContent?.trim() || '';

            // 이미지 URL 정규화
            if (thumbnail) {
              console.log('Original thumbnail URL:', thumbnail);
              console.log('Product title:', title);
              
              // 상대 경로인 경우 절대 경로로 변환
              if (thumbnail.startsWith('//')) {
                thumbnail = 'https:' + thumbnail;
              } else if (!thumbnail.startsWith('http')) {
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
              }
              
              console.log('Normalized thumbnail URL:', thumbnail);
            }

            return {
              thumbnail,
              url: url.startsWith('http') ? url : `${baseUrl}${url}`,
              title
            };
          })
          .filter(product => {
            // 버튼 이미지 등 불필요한 이미지 필터링
            return !product.thumbnail.includes('btn_') && 
                   !product.thumbnail.includes('button') &&
                   !product.thumbnail.includes('icon') &&
                   product.title; // 제목이 있는 상품만 포함
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