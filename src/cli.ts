#!/usr/bin/env node

import yargs from 'yargs/yargs';

import {FileServer} from './file-server';
import {FileHandler} from './file-handler';
import {prepareAppOptions} from './prepare-app-options';
import {showViewer} from './show-viewer';
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_DEBUG,
  DEFAULT_VERBOSE_LOGGING,
} from './defaults';
import {logError, logUnhandledError} from './log-error';
import {CaptureScreenShotOptions} from './types/CaptureScreenshotOptions';

const argv = yargs(process.argv.slice(2)).options({
  input: {
    type: 'string',
    alias: 'i',
    describe: 'Input glTF 2.0 binary (GLB) filepath',
    demandOption: true,
  },
  color: {
    type: 'string',
    alias: 'c',
    describe:
      'Output image background color (defaults to transparent, accepts HEX or RGB)',
  },
  width: {
    type: 'number',
    alias: 'w',
    describe: 'viewer width',
    default: DEFAULT_WIDTH,
  },
  height: {
    type: 'number',
    alias: 'h',
    describe: 'viewer height',
    default: DEFAULT_HEIGHT,
  },
  debug: {
    type: 'boolean',
    alias: 'd',
    describe: 'Enable Debug Mode',
    default: DEFAULT_DEBUG,
  },
  verbose: {
    type: 'boolean',
    alias: 'v',
    describe: 'Enable verbose logging',
    default: DEFAULT_VERBOSE_LOGGING,
  },
}).argv;

(async () => {
  async function closeProgram() {
    await localServer.stop();
    await fileHandler.destroy();
    console.log("all done.")
    process.exit(processStatus);
  }

  const fileHandler = new FileHandler();
  const localServer = new FileServer(fileHandler.fileDirectory);
  let options: CaptureScreenShotOptions;
  let processStatus = 0;

  await localServer.start();

  try {
    options = await prepareAppOptions({
      localServerPort: localServer.port,
      fileHandler,
      argv,
      debug: argv.debug,
    });
  } catch (error) {
    logError(error);
    processStatus = 1;
  }

  if (processStatus !== 0) {
    await closeProgram();
    return;
  }

  try {
    await showViewer(options, localServer, fileHandler);
  } catch (err) {
    logUnhandledError(err);
    processStatus = 1;
  }

  await closeProgram();
})();
