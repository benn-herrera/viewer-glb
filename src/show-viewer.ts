import puppeteer from 'puppeteer';
import {performance} from 'perf_hooks';
import {htmlTemplate, TemplateViewerOptions} from './html-template';
import {CaptureScreenShotOptions} from './types/CaptureScreenshotOptions';
import {logError} from './log-error';

const timeDelta = (start, end) => {
  return ((end - start) / 1000).toPrecision(3);
};

export async function showViewer(options: CaptureScreenShotOptions) {
  const browserT0 = performance.now();
  const {
    modelViewerUrl,
    width,
    height,
    debug,
    devicePixelRatio,
  } = options;

  const headless = false;
  const args = [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-zygote',
  ];

  // args.push('--single-process');
  // args.push('--start-maximized');

  const browser = await puppeteer.launch({
    args,
    defaultViewport: {
      width,
      height,
      deviceScaleFactor: devicePixelRatio,
    },
    headless,
  });

  const page = await browser.newPage();

  page.on('error', (error) => {
    console.log(`🚨  Page Error: ${error}`);
  });

  page.on('console', async (message) => {
    const args = await Promise.all(
      message.args().map((arg) => arg.jsonValue()),
    );

    if (args.length) {
      console.log(`➡️`, ...args);
    }
  });

  const contentT0 = performance.now();

  const data = htmlTemplate({...options, modelViewerUrl});
  await page.setContent(data, {
    waitUntil: ['domcontentloaded', 'networkidle0'],
  });

  const contentT1 = performance.now();

  console.log(
    `🗺  Viewer page loaded (${timeDelta(
      contentT0,
      contentT1,
    )}s)`,
  );

  console.log('🌐  Browser is open. Close the browser window to exit.');

  // AI! the program hangs here even after the browser is closed. fix this.
  await new Promise<void>((resolve) => {
    browser.on('disconnected', () => {
      resolve();
    });
  });

  console.log("browser closed.")
}
