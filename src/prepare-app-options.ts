import {colors} from './colors';
import {ViewerOptions} from './types/ViewerOptions';
import {getModelViewerUrl} from './get-model-viewer-url';
import {checkFileExistsAtUrl} from './check-file-exists-at-url';
import {getLocalUrl} from './get-local-url';
import {FileHandler} from './file-handler';
import {existsSync, statSync} from 'fs';
import path from 'path';

export interface Argv {
  input0: string;
  input1?: string;
  environmentMap: string;
  exposure: number;
  width: number;
  height: number;
  color?: string;
}

export interface PrepareAppOptionsArgs {
  localServerPort: number;
  fileHandler: FileHandler;
  argv: Argv;
}

export async function prepareAppOptions({
  localServerPort,
  fileHandler,
  argv,
}: PrepareAppOptionsArgs): Promise<ViewerOptions> {
  const {
    input0,
    input1,
    environmentMap,
    height,
    width,
    color: backgroundColor,
  } = argv;
  const inputs = [input0];
  if (input1) {
    inputs.push(input1);
  }
  const model3dFileNames = await fileHandler.addFiles(inputs);
  const inputPaths = model3dFileNames.map((n) => {
    return getLocalUrl({port: localServerPort, fileName: n});
  });
  const inputSizes = model3dFileNames.map((fileName) => {
    return statSync(fileName).size;
  });

  const defaultBackgroundColor = colors.gray;
  let environmentMapUrl: string = null;
  if (environmentMap) {
    if (existsSync(environmentMap)) {
      const envMapName = await fileHandler.addFiles([environmentMap]);
      environmentMapUrl = getLocalUrl({
        port: localServerPort,
        fileName: envMapName[0],
      });
    } else {
      environmentMapUrl = environmentMap;
    }
  }

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
    environmentMap: environmentMapUrl,
    exposure: argv.exposure,
    height,
    width,
    inputPaths,
    inputSizes,
  };
}
