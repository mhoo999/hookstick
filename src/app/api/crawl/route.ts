import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { Product } from '@/types/product';

export async function POST(request: Request) {
  let browser;
  try {
    const { url } = await request.json();
    console.log('Crawling URL:', url);

    browser = await chromium.launch({
      headless: true
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    
    const productListUrl = 'https://outofline.co.kr/product/list.html?cate_no=24';
    console.log('Navigating to product list URL:', productListUrl);
    
    await page.goto(productListUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    console.log('Waiting for products to load...');
    await page.waitForSelector('.prdList', { timeout: 10000 })
      .catch(() => console.log('Product list selector not found'));
    
    await page.waitForTimeout(2000);
    
    console.log('Page loaded, extracting products...');
    console.log('Current URL:', page.url());
    
    // 상품 정보 추출
    const products = await page.evaluate(() => {
      const items: any[] = [];
      
      document.querySelectorAll('.prdList > li.xans-record-').forEach((element) => {
        try {
          const imgElement = element.querySelector('.thumbnail img.thumbs');
          const nameElement = element.querySelector('.name span');
          const priceElement = element.querySelector('.price');
          const linkElement = element.querySelector('.thumbnail > a');
          const soldOutElement = element.querySelector('.icon_img[alt="품절"]');

          if (imgElement && nameElement) {
            const thumbnail = imgElement.getAttribute('src') || '';
            const name = nameElement.textContent?.trim() || '';
            const price = priceElement?.textContent?.trim().replace(/\s+/g, ' ') || (soldOutElement ? '품절' : '');
            const productUrl = linkElement?.getAttribute('href') || '';

            // URL이 이미 절대 경로인지 확인하고, 상대 경로인 경우에만 도메인을 추가
            const absoluteThumbnail = thumbnail.startsWith('http') 
              ? thumbnail 
              : thumbnail.startsWith('//')
                ? `https:${thumbnail}`
                : `https://outofline.co.kr${thumbnail}`;
            
            const absoluteUrl = productUrl.startsWith('http') 
              ? productUrl 
              : `https://outofline.co.kr${productUrl}`;

            console.log('Found product:', { name, price, thumbnail: absoluteThumbnail });

            items.push({
              thumbnail: absoluteThumbnail,
              name,
              price,
              url: absoluteUrl
            });
          }
        } catch (err) {
          console.error('Error processing element:', err);
        }
      });

      return items;
    });

    console.log(`Found ${products.length} products`);

    if (products.length === 0) {
      await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
      console.log('Captured debug screenshot');
      
      const debugInfo = await page.evaluate(() => ({
        title: document.title,
        url: window.location.href,
        bodyClasses: document.body.className,
        productListElements: {
          prdList: document.querySelectorAll('.prdList').length,
          listItems: document.querySelectorAll('.prdList > li.xans-record-').length,
          images: document.querySelectorAll('.prdList .thumbs').length,
          names: document.querySelectorAll('.prdList .name span').length
        }
      }));
      console.log('Debug info:', debugInfo);
    }
    
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Crawling error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        error: 'Failed to crawl the website',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
} 