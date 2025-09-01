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
import {ViewerOptions} from './types/ViewerOptions';

const argv = yargs()
  .command('$0', '', (yargs) => {
    yargs
    .positional('input0', {
      describe: 'glTF 2.0 binary (GLB) filepath',
      type: 'string',
      demand: true,
    })
    .positional('input1', {
      describe: 'glTF 2.0 binary (GLB) filepath',
      type: 'string',
    })
  })
  .options({
    color: {
      type: 'string',
      alias: 'c',
      describe:
        'background color (defaults to transparent, accepts HEX or RGB)',
    },
    environment_map: {
      type: 'string',
      alias: 'e',
      describe: 'HDR environment map image, neutral, or legacy',
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
  })
  .parse(process.argv.slice(2));


(async () => {
  async function closeProgram() {
    await localServer.stop();
    await fileHandler.destroy();
    console.log("all done.")
    process.exit(processStatus);
  }

  const fileHandler = new FileHandler();
  const localServer = new FileServer(fileHandler.fileDirectory);
  let options: ViewerOptions;
  let processStatus = 0;

  await localServer.start();

  try {
    options = await prepareAppOptions({
      localServerPort: localServer.port,
      fileHandler,
      argv: {
      inputs: argv._.map(String),
      environmentMap: argv.environment_map,
      debug: argv.debug,
      width: argv.width,
      height: argv.height,
      color: argv.color,
  },
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
