
import {colors} from './colors';
import {CaptureScreenShotOptions} from './types/CaptureScreenshotOptions';
import {getModelViewerUrl} from './get-model-viewer-url';
import {checkFileExistsAtUrl} from './check-file-exists-at-url';
import {getLocalUrl} from './get-local-url';
import {FileHandler} from './file-handler';

export interface Argv {
  inputs: string[];
  debug?: boolean;
  width: number;
  height: number;
  color?: string;
}

export interface PrepareAppOptionsArgs {
  localServerPort: number;
  fileHandler: FileHandler;
  argv: Argv;
  debug?: boolean;
}

export async function prepareAppOptions({
  localServerPort,
  fileHandler,
  debug,
  argv,
}: PrepareAppOptionsArgs): Promise<CaptureScreenShotOptions> {
  const {
    inputs,
    height,
    width,
    color: backgroundColor,
    debug: argvDebug,
  } = argv;
  const model3dFileNames = await fileHandler.addFiles(inputs);
  const inputPaths = model3dFileNames.map((n) => {
    return getLocalUrl({port: localServerPort, fileName: n})
  });  
  const defaultBackgroundColor = colors.transparent;
  
  const modelViewerUrl: string = getModelViewerUrl();

  const modelViewerUrlExists = await checkFileExistsAtUrl(modelViewerUrl);

  if (!modelViewerUrlExists) {
    throw new Error(
      'Unfortunately Model Viewer cannot be used to render a screenshot',
    );
  }

  return {
    modelViewerUrl,
    backgroundColor: backgroundColor || defaultBackgroundColor,
    height,
    width,
    debug: debug || argvDebug,
    inputPaths,
    modelViewerArgs: undefined,
    devicePixelRatio: 1,
  };
}
