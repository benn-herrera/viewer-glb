#!/usr/bin/env node

import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {FileServer} from './file-server';
import {FileHandler} from './file-handler';
import {prepareAppOptions} from './prepare-app-options';
import {showViewer} from './show-viewer';
import {DEFAULT_EXPOSURE, DEFAULT_WIDTH, DEFAULT_HEIGHT} from './defaults';
import {logError, logUnhandledError} from './log-error';
import {ViewerOptions} from './types/ViewerOptions';

const argv = yargs(hideBin(process.argv))
  .command(
    '$0 <input0> [input1]',
    'view one or compare two glb models.',
    (yargs) => {
      yargs
        .positional('input0', {
          describe: 'model to view',
          type: 'string',
        })
        .positional('input1', {
          describe: 'optional model to compare against.',
          type: 'string',
        });
    },
  )
  .options({
    color: {
      type: 'string',
      alias: 'c',
      describe:
        'background color (defaults to transparent, accepts HEX or RGB)',
    },
    environment_map: {
      type: 'string',
      describe: 'HDR environment map image, neutral, or legacy',
    },
    exposure: {
      type: 'number',
      describe: 'exposure in stops',
      default: DEFAULT_EXPOSURE,
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
  })
  .parse();

(async () => {
  async function closeProgram() {
    await localServer.stop();
    await fileHandler.destroy();
    // console.log("all done.")
    process.exit(processStatus);
  }

  const fileHandler = new FileHandler();
  const localServer = new FileServer(fileHandler.fileDirectory);
  let options: ViewerOptions;
  let processStatus = 0;

  await localServer.start();

  const av = {
    input0: argv['input0'],
    input1: argv['input1'],
    color: argv['color'],
    width: argv['width'],
    height: argv['height'],
    environmentMap: argv['environment_map'],
    exposure: argv['exposure'],
  };

  try {
    options = await prepareAppOptions({
      localServerPort: localServer.port,
      fileHandler,
      argv: av,
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
