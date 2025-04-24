import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function POST(request: Request) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const { url, baseUrl } = await request.json();
    console.log('Crawling URL:', url);
    console.log('Base URL:', baseUrl);
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 390, height: 844 },
      // 불필요한 리소스 차단
      bypassCSP: true,
      ignoreHTTPSErrors: true,
      // 캐시 활성화
      serviceWorkers: 'block',
      // 네트워크 요청 최적화
      extraHTTPHeaders: {
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });

    const page = await context.newPage();
    
    try {
      // 네트워크 요청 최적화
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        // 불필요한 리소스 차단
        if (['stylesheet', 'font', 'media'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      console.log('Navigating to page...');
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // JavaScript 로딩을 위한 대기
      await page.waitForTimeout(5000);

      // 페이지 스크롤하여 동적 로딩 유도
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(2000);

      console.log('Page loaded, evaluating...');
      const products = await page.evaluate((baseUrl: string) => {
        // 모든 이미지 찾기
        const images = Array.from(document.querySelectorAll('img'));
        console.log('Total images found:', images.length);

        return images
          .filter(img => {
            // 이미지 URL로 필터링
            const src = img.src || img.getAttribute('data-original') || '';
            const isProductImage = !src.includes('btn_') && 
                                 !src.includes('button') &&
                                 !src.includes('icon') &&
                                 !src.includes('logo') &&
                                 !src.includes('banner') &&
                                 !src.includes('spacer') &&
                                 !src.includes('blank') &&
                                 !src.includes('arrow') &&
                                 !src.includes('nav') &&
                                 !src.includes('menu') &&
                                 !src.includes('cart') &&
                                 !src.includes('search') &&
                                 !src.includes('close') &&
                                 !src.includes('prev') &&
                                 !src.includes('next') &&
                                 !src.includes('top') &&
                                 !src.includes('bottom') &&
                                 !src.includes('left') &&
                                 !src.includes('right') &&
                                 !src.includes('share') &&
                                 !src.includes('sns') &&
                                 !src.includes('social') &&
                                 !src.includes('kakao') &&
                                 !src.includes('naver') &&
                                 !src.includes('facebook') &&
                                 !src.includes('instagram') &&
                                 !src.includes('youtube') &&
                                 !src.includes('twitter');

            // 이미지가 상품 목록 컨테이너 내부에 있는지 확인
            const productListSelectors = [
              '.prdList',
              '.item-list',
              '.product-list',
              '.goods-list',
              '.xans-product',
              '[class*="product"]',
              '[class*="prd"]',
              '[class*="item"]'
            ];
            
            const isInProductList = productListSelectors.some(selector => 
              img.closest(selector) !== null
            );

            // 이미지 경로에서 상품 이미지 패턴 확인
            const isProductPath = src.includes('/product/') || 
                                src.includes('/goods/') || 
                                src.includes('/item/') ||
                                /\/[P|p]\d+\//.test(src);  // P1234 같은 상품 번호 패턴

            // 이미지가 링크 내부에 있는지 확인
            const link = img.closest('a');
            const isInLink = link !== null;
            
            // 링크 URL이 상품 페이지를 가리키는지 확인
            const linkUrl = link?.href || '';
            const isProductLink = linkUrl.includes('/product/') || 
                                linkUrl.includes('/goods/') || 
                                linkUrl.includes('/item/') ||
                                /\/[P|p]\d+/.test(linkUrl);

            // 이미지 크기로 필터링 (너무 작은 이미지는 제외)
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;
            const isLargeEnough = width > 100 && height > 100;

            // 이미지 비율 확인 (정사각형에 가까운 이미지 선호)
            const ratio = width / height;
            const isSquarish = ratio > 0.7 && ratio < 1.3;

            console.log('Image check:', {
              src,
              isProductImage,
              isInProductList,
              isProductPath,
              isInLink,
              isProductLink,
              width,
              height,
              ratio,
              isSquarish,
              isLargeEnough
            });

            return isProductImage && 
                   isLargeEnough && 
                   isSquarish &&
                   isInLink && 
                   (isInProductList || isProductPath || isProductLink);
          })
          .map(img => {
            const link = img.closest('a');
            let thumbnail = img.getAttribute('data-original') || img.src;
            const url = link?.href || '';

            if (thumbnail) {
              if (thumbnail.startsWith('//')) {
                thumbnail = 'https:' + thumbnail;
              } else if (!thumbnail.startsWith('http')) {
                const domainRegex = /^https?:\/\/[^\/]+/;
                thumbnail = thumbnail.replace(domainRegex, '');
                thumbnail = thumbnail.replace(/\/+/g, '/');
                if (!thumbnail.startsWith('/')) {
                  thumbnail = '/' + thumbnail;
                }
                thumbnail = baseUrl + thumbnail;
              }
            }

            return {
              thumbnail,
              url: url.startsWith('http') ? url : `${baseUrl}${url}`
            };
          })
          .filter(product => product.thumbnail)
          .slice(0, 20);
      }, baseUrl);

      console.log('Crawling completed. Found products:', products.length);
      await page.close();

      return NextResponse.json({ products });
    } catch (error) {
      console.error('Page evaluation error:', error);
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