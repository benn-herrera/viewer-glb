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
    defaultAttributes['environment-image'] = environmentMap;
  }

  // Extract file stems for headers
  const fileStems = inputPaths.map((path) => {
    const fileName = path.split('/').pop();
    return fileName.split('.').slice(0, -1).join('.');
  });

  const input0AttributesString = toHTMLAttributeString(defaultAttributes);
  const modelViewer0 = `<model-viewer id="viewer0" camera-controls ${input0AttributesString}/>`;
  let modelViewer1: string = '';
  let tableStart: string = `<table><thead><tr><th>${fileStems[0]}</th></tr></thead><tbody><tr><td>`;
  let tableSeparator = '';
  let tableEnd: string = '</td></tr></tbody></table>';

  if (inputPaths.length > 1) {
    defaultAttributes.src = inputPaths[1];
    const input1AttributesString = toHTMLAttributeString(defaultAttributes);
    modelViewer1 = `<model-viewer id="viewer1" camera-controls ${input1AttributesString}/>`;
    tableStart = `<table><thead><tr><th>${fileStems[0]}</th><th>Diff</th><th>${fileStems[1]}</th></tr></thead><tbody><tr><td>`;
    tableSeparator = '</td><td><canvas id="diff" class="diffView"></canvas></td><td>';
  }

  return `<!DOCTYPE html>
<html>
  <head>
    <title>Viewer-GLB</title>
    <meta name="viewport" content="width=device-width, initial-scale=${devicePixelRatio}">
    <script type="module"
      src="${modelViewerUrl}">
    </script>
    <script>
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

        // Create image diff if we have two viewers
        if (viewer0 && viewer1) {
          const diffCanvas = document.getElementById('diff');
          if (diffCanvas) {
            const ctx = diffCanvas.getContext('2d');
            if (ctx) {
              // Set canvas dimensions
              diffCanvas.width = ${width};
              diffCanvas.height = ${height};
              
              function updateDiff() {
                // Get the rendered images from both viewers
                viewer0.toBlob((blob0) => {
                  viewer1.toBlob((blob1) => {
                    if (blob0 && blob1) {
                      const img0 = new Image();
                      const img1 = new Image();
                      
                      img0.onload = () => {
                        img1.onload = () => {
                          // Clear canvas
                          ctx.clearRect(0, 0, diffCanvas.width, diffCanvas.height);
                          
                          // Draw first image
                          ctx.drawImage(img0, 0, 0);
                          
                          // Get image data for both images
                          const imageData0 = ctx.getImageData(0, 0, diffCanvas.width, diffCanvas.height);
                          const data0 = imageData0.data;
                          
                          ctx.drawImage(img1, 0, 0);
                          const imageData1 = ctx.getImageData(0, 0, diffCanvas.width, diffCanvas.height);
                          const data1 = imageData1.data;
                          
                          // Create diff image data
                          const diffImageData = ctx.createImageData(diffCanvas.width, diffCanvas.height);
                          const diffData = diffImageData.data;
                          
                          // Calculate diff (simple absolute difference)
                          for (let i = 0; i < data0.length; i += 4) {
                            diffData[i] = Math.abs(data0[i] - data1[i]);     // Red
                            diffData[i + 1] = Math.abs(data0[i + 1] - data1[i + 1]); // Green
                            diffData[i + 2] = Math.abs(data0[i + 2] - data1[i + 2]); // Blue
                            diffData[i + 3] = 255; // Alpha
                          }
                          
                          // Draw diff image
                          ctx.putImageData(diffImageData, 0, 0);
                        };
                        img1.src = URL.createObjectURL(blob1);
                      };
                      img0.src = URL.createObjectURL(blob0);
                    }
                  });
                });
              }
              
              // Update diff when either viewer finishes loading
              viewer0.addEventListener('load', updateDiff);
              viewer1.addEventListener('load', updateDiff);
              
              // Update diff on camera changes (after a short delay to allow rendering)
              let diffTimeout;
              const scheduleDiffUpdate = () => {
                clearTimeout(diffTimeout);
                diffTimeout = setTimeout(updateDiff, 100);
              };
              
              viewer0.addEventListener('camera-change', scheduleDiffUpdate);
              viewer1.addEventListener('camera-change', scheduleDiffUpdate);
            }
          }
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
      .diffView {
        width: ${width}px;
        height: ${height}px;
      }
      h2 {
        text-align: center;
        margin: 10px 0;
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
