const puppeteer = require('puppeteer');
const fs = require('fs');
const downloader = require('image-downloader');

function getLargestImageFromSrcSet(srcSet) {
    const splitedSrcs = srcSet.split(',');
    const imgSrc = splitedSrcs[splitedSrcs.length - 1].split(' ')[0];
    return imgSrc;
}

function extractItems() {
    const extractedElements = document.querySelectorAll('div._2z6nI > div.Nnq7C.weEfm');
    const items = [];
    for (let element of extractedElements) {
        items.push(element.innerText);
    }
    return items;
}

async function scrapeInfiniteScrollItems(
    page,
    extractItems,
    itemTargetCount,
    scrollDelay = 1,
) {
    let items = [];
    try {
        let previousHeight;
        while (items.length < itemTargetCount) {
            items = await page.evaluate(extractItems);
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            await page.waitFor(scrollDelay);
        }
    } catch (e) {}
    return items;
}

async function getImageUrlsFromPage(url) {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 926 });
    await page.goto(url, {
        waitUntil: 'load'
    });
    // await timeout(5000);

    const items = await scrapeInfiniteScrollItems(page, extractItems, 100);

    const imageSrcSets = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('article img'));
        const srcSetAttribute = imgs.map(i => i.getAttribute('srcset'));
        return srcSetAttribute;
    });

    const imgUrls = imageSrcSets.map(srcSet => getLargestImageFromSrcSet(srcSet));
    await browser.close();
    return imgUrls;
};

async function main() {
    const resultFolder = './result';
    if (!fs.existsSync(resultFolder)) {
        fs.mkdirSync(resultFolder);
    }

    const instaUrl = 'https://www.instagram.com/hot_sexy_asian_girrls/';
    const images = await getImageUrlsFromPage(instaUrl);
    images.forEach((image) => {
        downloader({
            url: image,
            dest: resultFolder
        })
    })
}
main();