import {getModelViewerUrl} from './get-model-viewer-url';

type AttributesObject = {[key: string]: any};

export interface TemplateViewerOptions {
  modelViewerUrl: string;
  width: number;
  height: number;
  inputPaths: string[];
  backgroundColor: string;
  environmentMap: string;
  exposure: number;
  devicePixelRatio: number;
  modelViewerArgs?: AttributesObject;
}

function toHTMLAttributeString(args: AttributesObject | undefined) {
  if (!args) return '';

  return Object.entries(args)
    .map(([key, value]) => {
      return `${key}="${value}"`;
    })
    .join('\n');
}

const errorMessagesForAttributeKey = {
  src: '`src` cannot be ovewritten pass the source via -i instead',
  'interaction-prompt':
    '`interaction-prompt` cannot be passed since it would cause unexpected renders',
  style: '`style` cannot be passed since it would cause unexpected renders',
  id: '`id` cannot be passed since it would cause the renderer to break',
};


export function htmlTemplate({
  modelViewerUrl,
  width,
  height,
  inputPaths,
  backgroundColor,
  devicePixelRatio,
  environmentMap,
  exposure,
}: TemplateViewerOptions): string {
  const defaultAttributes = {
    style: `background-color: ${backgroundColor};`,
    'interaction-prompt': 'none',
    'min-camera-orbit': 'default default 0.25m',
    'max-camera-orbit': 'default default 10m',
    'interpolation-decay': 1,
    exposure: Math.pow(2, exposure),
    src: inputPaths[0],
  };

  if (environmentMap) {
    defaultAttributes['environment-image'] = environmentMap
  }

  const input0AttributesString = toHTMLAttributeString(defaultAttributes);
  const modelViewer0 = `<model-viewer id="viewer0" camera-controls ${input0AttributesString}/>`;
  let modelViewer1: string = ""
  let tableStart: string = ""
  let tableSeparator = ""
  let tableEnd: string = ""

  if (inputPaths.length > 1) {
    defaultAttributes.src = inputPaths[1]
    const input1AttributesString = toHTMLAttributeString(defaultAttributes);
    modelViewer1 = `<model-viewer id="viewer1" camera-controls ${input1AttributesString}/>`;
    tableStart = '<table><tr><td>'
    tableSeparator = '</td><td>'
    tableEnd = '</td></tr></table>'
  }

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=${devicePixelRatio}">
    <script type="module"
      src="${modelViewerUrl}">
    </script>
    <script>
      window.resizeTo(${width * inputPaths.length}, ${height});

      let firstCall = true;

      function copyCameraParams(fromCam, toCam) {
        if (firstCall) {
          const fromParams = fromCam.getCameraOrbit();
          const toParams = toCam.getCameraOrbit();
          // synchronize at higher camera radius
          const radius = Math.max(fromParams.radius, toParams.radius);
          fromCam.cameraOrbit = String(fromParams.theta) + 'rad ' + String(fromParams.phi) + 'rad ' + String(radius) + 'm';
          toCam.cameraOrbit = String(toParams.theta) + 'rad ' + String(toParams.phi) + 'rad ' + String(radius) + 'm';
          firstCall = false;
        }
        else {
          const fromParams = fromCam.getCameraOrbit();
          const theta = String(fromParams.theta);
          const phi = String(fromParams.phi);
          radius = String(String(fromParams.radius));
          toCam.cameraOrbit = theta + 'rad ' + phi + 'rad ' + radius + 'm';
        }        
      }

      window.addEventListener('load', () => {        
        // Synchronize camera controls between viewers
        const viewer0 = document.getElementById('viewer0');
        const viewer1 = document.getElementById('viewer1');

        if (viewer0 && viewer1) {          
          viewer0.addEventListener('camera-change', () => {
            copyCameraParams(viewer0, viewer1);
          });          
        }
      });
    </script>
    <style>
      body {
        margin: 0;
      }
      model-viewer {
        width: ${width}px;
        height: ${height}px;
      }
    </style>
  </head>
  <body>
  ${tableStart}
  ${modelViewer0}
  ${tableSeparator}
  ${modelViewer1}
  ${tableEnd}
  </body>
</html>
`;
}
