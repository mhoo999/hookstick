import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

interface ProductElement extends Element {
  querySelector(selectors: string): HTMLElement | null;
  querySelectorAll(selectors: string): NodeListOf<HTMLElement>;
}

interface DebugInfo {
  title: string;
  url: string;
  bodyClasses: string;
  productListElements: {
    prdList: number;
    listItems: number;
    images: number;
    names: number;
  };
}

export async function POST(request: Request) {
  const browser = await chromium.launch();

  try {
    const { url, daysToSearch, baseUrl } = await request.json();
    console.log('Crawling URL:', url);
    console.log('Days to search:', daysToSearch);

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    
    // 페이지 이동
    console.log('Navigating to URL:', url);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');

    // 상품 목록 페이지 찾기
    let productListUrl = url;
    if (!url.includes('product') && !url.includes('goods') && !url.includes('items')) {
      console.log('Searching for product list page...');
      const productListLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .map(link => link.href)
          .filter(href => 
            href && 
            !href.includes('#') && // 해시 URL 제외
            (
              href.includes('product/list') || 
              href.includes('goods/list') || 
              href.includes('items/list') ||
              href.includes('category') ||
              href.includes('cate_no')
            )
          );
      });

      if (productListLinks.length > 0) {
        // 가장 긴 URL을 선택 (일반적으로 더 구체적인 상품 목록 페이지)
        productListUrl = productListLinks.reduce((longest, current) => 
          current.length > longest.length ? current : longest
        );
        console.log('Found product list page:', productListUrl);
        await page.goto(productListUrl, { waitUntil: 'networkidle' });
        await page.waitForLoadState('domcontentloaded');
      }
    }

    // 상품 목록 로딩 대기
    console.log('Waiting for products to load...');
    await page.waitForTimeout(2000); // 추가 대기 시간

    // 디버그 정보 수집
    const title = await page.title();
    const currentUrl = page.url();
    const bodyClasses = await page.evaluate(() => document.body.className);

    // 상품 목록 요소 찾기 시도
    const products = await page.evaluate((baseUrl) => {
      const products = [];
      
      // 여러 선택자 시도
      const selectors = [
        { container: '.prdList', items: '.prdList > li' },
        { container: '.item-list', items: '.item-list > .item' },
        { container: '.product-list', items: '.product-list > .product' },
        { container: '#productList', items: '#productList > div' }
      ];
      
      let foundProducts: ProductElement[] = [];
      
      for (const selector of selectors) {
        const container = document.querySelector(selector.container);
        if (container) {
          const items = document.querySelectorAll<ProductElement>(selector.items);
          if (items.length > 0) {
            foundProducts = Array.from(items);
            break;
          }
        }
      }

      // 디버그용 요소 카운트
      const debugCounts = {
        prdList: document.querySelectorAll('.prdList').length,
        listItems: document.querySelectorAll('.prdList > li').length,
        images: document.querySelectorAll('.prdList img').length,
        names: document.querySelectorAll('.prdList .name').length
      };
      console.log('Product list elements:', debugCounts);

      for (const item of foundProducts) {
        try {
          // 여러 선택자 시도
          const thumbnail = 
            item.querySelector('img')?.getAttribute('src') || 
            item.querySelector('.thumbnail img')?.getAttribute('src') ||
            item.querySelector('.prdImg img')?.getAttribute('src');
            
          const name = 
            item.querySelector('.name')?.textContent?.trim() ||
            item.querySelector('.prdName')?.textContent?.trim() ||
            item.querySelector('h2, h3, h4')?.textContent?.trim();
            
          const price = 
            item.querySelector('.price')?.textContent?.trim() ||
            item.querySelector('.prdPrice')?.textContent?.trim();
            
          let url = 
            item.querySelector('a')?.getAttribute('href') ||
            item.querySelector('.thumbnail a')?.getAttribute('href') ||
            item.querySelector('.prdImg a')?.getAttribute('href');

          // URL이 상대 경로인 경우 baseUrl과 결합
          if (url && !url.startsWith('http')) {
            url = new URL(url, baseUrl).toString();
          }

          if (thumbnail && name && price && url) {
            // 이미지 URL 정리
            let cleanThumbnail = thumbnail;
            if (thumbnail.startsWith('http')) {
              try {
                const thumbnailUrl = new URL(thumbnail);
                if (thumbnailUrl.pathname.includes(thumbnailUrl.hostname)) {
                  cleanThumbnail = `${thumbnailUrl.origin}/${thumbnailUrl.pathname.replace(new RegExp(`^/?${thumbnailUrl.hostname}`), '')}`;
                }
              } catch (error) {
                console.error('Error cleaning thumbnail URL:', error);
              }
            } else {
              cleanThumbnail = `${baseUrl}${thumbnail}`;
            }

            products.push({
              thumbnail: cleanThumbnail,
              name,
              price: price.replace(/[^0-9]/g, ''),
              url,
              date: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error processing product:', error);
        }
      }

      return { 
        products, 
        debugInfo: { 
          title: document.title, 
          url: window.location.href, 
          bodyClasses: document.body.className, 
          productListElements: debugCounts 
        } 
      };
    }, baseUrl);

    // 디버그 정보 출력
    console.log('Page loaded, extracting products...');
    console.log('Current URL:', products.debugInfo.url);
    console.log('Found', products.products.length, 'products');

    // 상품을 찾지 못한 경우 스크린샷 캡처
    if (products.products.length === 0) {
      await page.screenshot({ path: 'debug-screenshot.png' });
      console.log('Captured debug screenshot');
      console.log('Debug info:', products.debugInfo);
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await browser.close();
  }
} 