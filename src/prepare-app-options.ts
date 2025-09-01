
import {colors} from './colors';
import {CaptureScreenShotOptions} from './types/CaptureScreenshotOptions';
import {getModelViewerUrl} from './get-model-viewer-url';
import {checkFileExistsAtUrl} from './check-file-exists-at-url';
import {getLocalUrl} from './get-local-url';
import {FileHandler} from './file-handler';

export interface Argv {
  input: string;
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
    input,
    height,
    width,
    color: backgroundColor,
    debug: argvDebug,
  } = argv;
  const model3dFileName = await fileHandler.addFile(input);
  const inputPath = getLocalUrl({
    port: localServerPort,
    fileName: model3dFileName,
  });
  const outputPath = input.replace(/\.[^/.]+$/, '.png');
  const format = 'image/png';
  const formatExtension = 'png';
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
    inputPath,
    modelViewerArgs: undefined,
    devicePixelRatio: 1,
  };
}
