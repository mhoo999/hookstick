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
    if (!url.includes('product/list') && !url.includes('goods/list') && !url.includes('items/list')) {
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
              href.includes('cate_no') ||
              href.includes('list.html') // 카페24 쇼핑몰용
            )
          );
      });

      if (productListLinks.length > 0) {
        // 카테고리 링크 우선 선택
        const categoryLinks = productListLinks.filter(link => 
          link.includes('cate_no') || 
          link.includes('category')
        );
        
        if (categoryLinks.length > 0) {
          productListUrl = categoryLinks[0];
        } else {
          // 가장 긴 URL을 선택 (일반적으로 더 구체적인 상품 목록 페이지)
          productListUrl = productListLinks.reduce((longest, current) => 
            current.length > longest.length ? current : longest
          );
        }
        
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
      
      // 여러 선택자 시도 (카페24 쇼핑몰용 추가)
      const selectors = [
        { container: '.prdList', items: '.prdList > li' },
        { container: '.item-list', items: '.item-list > .item' },
        { container: '.product-list', items: '.product-list > .product' },
        { container: '#productList', items: '#productList > div' },
        { container: '.xans-product-listnormal', items: '.xans-product-listnormal > li' },
        { container: '.xans-product-listpackage', items: '.xans-product-listpackage > li' },
        { container: '.xans-product-list', items: '.xans-product-list > li' }, // 카페24 쇼핑몰용
        { container: '.xans-product-listnormal', items: '.xans-product-listnormal > li' }, // 카페24 쇼핑몰용
        { container: '.xans-product-listpackage', items: '.xans-product-listpackage > li' } // 카페24 쇼핑몰용
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

      // 상품 목록을 찾지 못한 경우, 모든 li 요소에서 상품 찾기 시도
      if (foundProducts.length === 0) {
        const allItems = document.querySelectorAll('li');
        foundProducts = Array.from(allItems).filter(item => {
          const hasImage = item.querySelector('img');
          const hasName = item.querySelector('.name, .prdName, h2, h3, h4');
          const hasPrice = item.querySelector('.price, .prdPrice');
          return hasImage && hasName && hasPrice;
        });
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
            item.querySelector('.prdImg img')?.getAttribute('src') ||
            item.querySelector('img[data-nimg="fill"]')?.getAttribute('src') || // Next.js 이미지
            item.querySelector('img.thumbs_hover')?.getAttribute('src'); // 썸네일 이미지
            
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

          // 이미지 URL 정리
          let cleanThumbnail = thumbnail;
          if (thumbnail) {
            try {
              // Next.js 이미지 URL 처리
              if (thumbnail.includes('/_next/image?')) {
                const urlParams = new URLSearchParams(thumbnail.split('?')[1]);
                const imageUrl = urlParams.get('url');
                if (imageUrl) {
                  cleanThumbnail = decodeURIComponent(imageUrl);
                }
              }
              
              // 상대 경로 처리
              if (cleanThumbnail && cleanThumbnail.startsWith('//')) {
                cleanThumbnail = `https:${cleanThumbnail}`;
              } else if (cleanThumbnail && !cleanThumbnail.startsWith('http')) {
                cleanThumbnail = `${baseUrl}${cleanThumbnail}`;
              }

              // 중복 도메인 제거
              if (cleanThumbnail) {
                const thumbnailUrl = new URL(cleanThumbnail);
                if (thumbnailUrl.pathname.includes(thumbnailUrl.hostname)) {
                  cleanThumbnail = `${thumbnailUrl.origin}/${thumbnailUrl.pathname.replace(new RegExp(`^/?${thumbnailUrl.hostname}`), '')}`;
                }
              }
            } catch (error) {
              console.error('Error cleaning thumbnail URL:', error);
            }
          }

          if (cleanThumbnail && name && price && url) {
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
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = `debug-screenshot-${timestamp}.png`;
      await page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });
      console.log('Captured debug screenshot:', screenshotPath);
      
      // 페이지의 HTML 구조도 저장
      const html = await page.content();
      console.log('Page HTML structure:', html.substring(0, 1000) + '...');
      
      // 모든 이미지 URL 수집
      const imageUrls = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map(img => img.src);
      });
      console.log('Found image URLs:', imageUrls);

      // 모든 링크 URL 수집
      const linkUrls = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map(link => link.href);
      });
      console.log('Found link URLs:', linkUrls);

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