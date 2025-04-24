import { NextResponse } from 'next/server';
import playwright from 'playwright';

const MAX_RETRIES = 3;
const TIMEOUT = 30000; // 30초

interface Product {
  url: string;
  thumbnail: string;
  price: number | null;
}

// 상품 이미지가 아닌 것들의 키워드
const EXCLUDED_IMAGE_KEYWORDS = [
  'logo', 'btn', 'button', 'icon', 'banner', 'ad_', 'nav_', 'menu',
  'cart', 'search', 'close', 'prev', 'next', 'top', 'bottom', 'left', 'right',
  'share', 'sns', 'social', 'kakao', 'naver', 'facebook', 'instagram',
  'youtube', 'twitter', 'header', 'footer', 'background', 'bg_', 'popup',
  'loading', 'spinner', 'arrow', 'dot', 'slide', 'blank', 'empty'
];

// 상품 이미지일 가능성이 높은 경로 키워드
const PRODUCT_PATH_KEYWORDS = [
  '/product/', '/goods/', '/item/', '/prod/', '/products/',
  '/goods_images/', '/item_images/', '/product_images/',
  '/shop/', '/shopping/', '/catalog/'
];

async function crawlWithRetry(url: string, baseUrl: string, limit: number, retryCount = 0): Promise<{ products: Product[] }> {
  try {
    const browser = await playwright.chromium.launch({
      headless: true
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    
    // 리소스 차단 설정
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // 타임아웃 설정
    await page.goto(url, {
      timeout: TIMEOUT,
      waitUntil: 'networkidle'
    });

    // 상품 정보 추출
    const products = await page.evaluate(
      ({ baseUrl, excludedKeywords, productPathKeywords }) => {
        const items = [];
        
        // 상품 컨테이너 선택자들
        const productContainerSelectors = [
          '.prd_list', '.product_list', '.goods_list', '.item_list',
          '[class*="product-list"]', '[class*="productList"]',
          '[class*="goods-list"]', '[class*="goodsList"]',
          '[class*="item-list"]', '[class*="itemList"]',
          '[class*="product_wrap"]', '[class*="productWrap"]'
        ];

        // 가격 선택자들
        const priceSelectors = [
          '[class*="price"]', '[class*="Price"]',
          '[class*="cost"]', '[class*="Cost"]',
          '[class*="won"]', '[class*="Won"]'
        ];

        // 상품 컨테이너 내부의 링크만 검색
        const containers = productContainerSelectors
          .map(selector => [...document.querySelectorAll(selector)])
          .flat();

        if (containers.length === 0) {
          containers.push(document.body);
        }

        containers.forEach(container => {
          const links = [...container.querySelectorAll('a')];
          
          links.forEach(link => {
            const url = link.href;
            if (!url || !url.includes(baseUrl)) return;

            // 상품 상세 페이지 URL인지 확인
            const isProductUrl = productPathKeywords.some(keyword => url.includes(keyword)) ||
                               /\/[P|p]\d+/.test(url);

            if (!isProductUrl) return;

            // 이미지 검색
            const images = [...link.querySelectorAll('img')];
            let bestImage = null;
            let maxArea = 0;

            images.forEach(img => {
              const src = img.src || img.getAttribute('data-original') || '';
              if (!src) return;

              // 제외할 이미지 키워드 체크
              if (excludedKeywords.some(keyword => 
                src.toLowerCase().includes(keyword.toLowerCase())
              )) return;

              // 이미지 크기 체크
              const width = img.naturalWidth || img.width || parseInt(img.getAttribute('width') || '0');
              const height = img.naturalHeight || img.height || parseInt(img.getAttribute('height') || '0');
              
              // 최소 크기 체크 (너무 작은 이미지 제외)
              if (width < 100 || height < 100) return;

              // 이미지 비율 체크 (정사각형에 가까운 이미지 선호)
              const ratio = width / height;
              if (ratio < 0.5 || ratio > 2) return;

              const area = width * height;
              if (area > maxArea) {
                maxArea = area;
                bestImage = img;
              }
            });

            if (!bestImage) return;

            // 가격 추출
            let price = null;
            for (const selector of priceSelectors) {
              const priceElement = link.querySelector(selector);
              if (priceElement) {
                const priceText = priceElement.textContent;
                if (priceText) {
                  const matches = priceText.match(/[\d,]+/);
                  if (matches) {
                    price = parseInt(matches[0].replace(/,/g, ''));
                    break;
                  }
                }
              }
            }

            // 썸네일 URL 정규화
            let thumbnail = bestImage.getAttribute('data-original') || bestImage.src;
            if (thumbnail.startsWith('//')) {
              thumbnail = 'https:' + thumbnail;
            } else if (!thumbnail.startsWith('http')) {
              thumbnail = new URL(thumbnail, baseUrl).href;
            }

            items.push({ url, thumbnail, price });
          });
        });

        return items;
      },
      { baseUrl, excludedKeywords: EXCLUDED_IMAGE_KEYWORDS, productPathKeywords: PRODUCT_PATH_KEYWORDS }
    );

    await browser.close();
    // 요청된 개수만큼만 반환
    return { products: (products || []).slice(0, limit) };

  } catch (error) {
    console.error(`Crawling error (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      return crawlWithRetry(url, baseUrl, limit, retryCount + 1);
    }
    
    // 에러 메시지 상세화
    let errorMessage = '크롤링 중 오류가 발생했습니다.';
    if (error instanceof Error) {
      if (error.message.includes('net::ERR_CONNECTION_TIMED_OUT') || error.message.includes('TimeoutError')) {
        errorMessage = '사이트 연결 시간이 초과되었습니다. 사이트가 응답하지 않습니다.';
      } else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
        errorMessage = '사이트에 연결할 수 없습니다. 사이트가 차단되었거나 접근이 거부되었습니다.';
      } else if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        errorMessage = '사이트 주소를 찾을 수 없습니다. URL이 올바른지 확인해주세요.';
      } else if (error.message.includes('net::ERR_ABORTED')) {
        errorMessage = '페이지 로딩이 중단되었습니다. 사이트의 보안 설정을 확인해주세요.';
      } else {
        errorMessage = error.message;
      }
    }
    
    throw new Error(errorMessage);
  }
}

export async function POST(req: Request) {
  try {
    const { url, baseUrl, limit = 20 } = await req.json();

    if (!url || !baseUrl) {
      return NextResponse.json(
        { message: 'URL과 baseUrl은 필수 입력값입니다.' },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { message: '올바른 URL 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    const result = await crawlWithRetry(url, baseUrl, limit);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Crawling error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '크롤링 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 