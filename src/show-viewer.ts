import puppeteer from 'puppeteer';
import {FileServer} from './file-server';
import {htmlTemplate} from './html-template';
import {ViewerOptions} from './types/ViewerOptions';
import {FileHandler} from './file-handler';

const timeDelta = (start, end) => {
  return ((end - start) / 1000).toPrecision(3);
};

export async function showViewer(
  options: ViewerOptions,
  localServer: FileServer,
  fileHandler: FileHandler,
) {
  const {modelViewerUrl, width, height, devicePixelRatio} = options;
  const winWidth = width * options.inputPaths.length + (options.inputPaths.length > 1 ? 10 : 3);
  const winHeight = height + (options.inputPaths.length > 1 ? 130 : 70);
  const data = htmlTemplate({...options, modelViewerUrl}, winWidth, winHeight);
  const indexPath = await fileHandler.createFile({
    fileName: 'index.html',
    fileContent: data,
  });

  const headless = false;
  const args = [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-zygote',
    `--window-size=${winWidth},${winHeight}`,
    '--app=file://' + indexPath,
  ];

  const browser = await puppeteer.launch({
    args,
    defaultViewport: {
      width: winWidth,
      height: winHeight,
      deviceScaleFactor: devicePixelRatio,
    },
    headless,
  });

  console.log('🌐  Browser is open. Close the browser window to exit.');

  // Wait for the browser to be closed by the user
  await new Promise<void>((resolve) => {
    const checkClosed = async () => {
      const pages = await browser.pages();
      if (pages.length === 0) {
        resolve();
      }
    };

    browser.on('disconnected', () => {
      resolve();
    });

    browser.on('targetdestroyed', checkClosed);

    // Also check periodically in case events are missed
    const interval = setInterval(async () => {
      try {
        const pages = await browser.pages();
        if (pages.length === 0) {
          clearInterval(interval);
          resolve();
        }
      } catch (error) {
        // Browser is likely closed
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });
}
