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

interface ProductInfo {
  thumbnail: string;
  url: string;
}

export async function POST(request: Request) {
  const browser = await chromium.launch();

  try {
    const { url, baseUrl } = await request.json();
    if (!url || !baseUrl) {
      return NextResponse.json(
        { error: 'URL and baseUrl are required' },
        { status: 400 }
      );
    }

    console.log('Crawling URL:', url);
    console.log('Base URL:', baseUrl);

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const mainPage = await context.newPage();
    
    try {
      console.log('Navigating to URL:', url);
      const response = await mainPage.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000
      });

      if (!response) {
        throw new Error('Failed to load page: No response received');
      }

      if (!response.ok()) {
        throw new Error(`Failed to load page: ${response.status()} ${response.statusText()}`);
      }

      await mainPage.waitForLoadState('domcontentloaded');

      let productListUrl = url;
      if (!url.includes('product/list') && !url.includes('goods/list') && !url.includes('items/list')) {
        console.log('Searching for product list page...');
        const productListLinks = await mainPage.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          return links
            .map(link => link.href)
            .filter(href => 
              href && 
              !href.includes('#') && 
              (
                href.includes('product/list') || 
                href.includes('goods/list') || 
                href.includes('items/list') ||
                href.includes('category') ||
                href.includes('cate_no') ||
                href.includes('list.html')
              )
            );
        });

        if (productListLinks.length > 0) {
          const categoryLinks = productListLinks.filter(link => 
            link.includes('cate_no') || 
            link.includes('category')
          );
          
          if (categoryLinks.length > 0) {
            productListUrl = categoryLinks[0];
          } else {
            productListUrl = productListLinks.reduce((longest, current) => 
              current.length > longest.length ? current : longest
            );
          }
          
          console.log('Found product list page:', productListUrl);
          const listPageResponse = await mainPage.goto(productListUrl, { 
            waitUntil: 'networkidle',
            timeout: 30000
          });

          if (!listPageResponse || !listPageResponse.ok()) {
            throw new Error(`Failed to load product list page: ${listPageResponse?.status()} ${listPageResponse?.statusText()}`);
          }

          await mainPage.waitForLoadState('domcontentloaded');
        }
      }

      console.log('Waiting for products to load...');
      await mainPage.waitForTimeout(2000);

      const { products, debugInfo } = await mainPage.evaluate((baseUrl: string) => {
        const products: ProductInfo[] = [];
        
        const selectors = [
          { container: '.prdList', items: '.prdList > li' },
          { container: '.item-list', items: '.item-list > .item' },
          { container: '.product-list', items: '.product-list > .product' },
          { container: '#productList', items: '#productList > div' },
          { container: '.xans-product-listnormal', items: '.xans-product-listnormal > li' },
          { container: '.xans-product-listpackage', items: '.xans-product-listpackage > li' },
          { container: '.xans-element-', items: 'li.xans-record-' },
          { container: '.xans-product-1', items: 'li.item.xans-record-' },
          { container: '#contents', items: 'li[id^="anchorBoxId_"]' }
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

        if (foundProducts.length === 0) {
          const allItems = document.querySelectorAll('li');
          foundProducts = Array.from(allItems).filter(item => {
            const hasImage = item.querySelector('img');
            const hasLink = item.querySelector('a[href*="product"], a[href*="goods"]');
            return hasImage && hasLink;
          });
        }

        const debugCounts = {
          prdList: document.querySelectorAll('.prdList').length,
          listItems: document.querySelectorAll('.prdList > li').length,
          images: document.querySelectorAll('.prdList img').length,
          names: document.querySelectorAll('.prdList .name').length
        };

        for (const item of foundProducts) {
          try {
            const thumbnail = 
              item.querySelector('.thumb, img.thumbs')?.getAttribute('src') || 
              item.querySelector('.thumbnail img')?.getAttribute('src') ||
              item.querySelector('img[alt*="상품이미지"]')?.getAttribute('src');
              
            let url = 
              item.querySelector('a[href*="product/detail"]')?.getAttribute('href') ||
              item.querySelector('a[href*="goods/view"]')?.getAttribute('href') ||
              item.querySelector('.thumbnail a')?.getAttribute('href') ||
              item.querySelector('a')?.getAttribute('href');

            if (url && !url.startsWith('http')) {
              url = new URL(url, baseUrl).toString();
            }

            let cleanThumbnail = thumbnail;
            if (thumbnail) {
              try {
                if (thumbnail.includes('/_next/image?')) {
                  const urlParams = new URLSearchParams(thumbnail.split('?')[1]);
                  const imageUrl = urlParams.get('url');
                  if (imageUrl) {
                    cleanThumbnail = decodeURIComponent(imageUrl);
                  }
                }
                
                if (cleanThumbnail && cleanThumbnail.startsWith('//')) {
                  cleanThumbnail = `https:${cleanThumbnail}`;
                } else if (cleanThumbnail && !cleanThumbnail.startsWith('http')) {
                  cleanThumbnail = `${baseUrl}${cleanThumbnail}`;
                }

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

            if (cleanThumbnail && url) {
              products.push({
                thumbnail: cleanThumbnail,
                url
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

      if (!products || products.length === 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `debug-screenshot-${timestamp}.png`;
        await mainPage.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });
        console.log('Captured debug screenshot:', screenshotPath);

        throw new Error('No products found on the page');
      }

      await mainPage.close();

      return NextResponse.json({ 
        products,
        debugInfo: {
          ...debugInfo,
          totalProducts: products.length,
          crawlingTime: new Date().toISOString()
        }
      });

    } catch (error) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `error-screenshot-${timestamp}.png`;
        await mainPage.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });
        console.error('Error screenshot saved:', screenshotPath);
      } catch (screenshotError) {
        console.error('Failed to capture error screenshot:', screenshotError);
      }

      throw error;
    }

  } catch (error) {
    console.error('Crawling error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  } finally {
    await browser.close();
  }
} 