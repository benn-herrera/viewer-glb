import {getModelViewerUrl} from './get-model-viewer-url';

type AttributesObject = {[key: string]: any};

export interface TemplateViewerOptions {
  modelViewerUrl: string;
  width: number;
  height: number;
  inputPaths: string[];
  inputSizes: number[];
  backgroundColor: string;
  environmentMap: string;
  exposure: number;
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

export function htmlTemplate(
  {
    modelViewerUrl,
    width,
    height,
    inputPaths,
    inputSizes,
    backgroundColor,
    environmentMap,
    exposure,
  }: TemplateViewerOptions,
  winWidth: number,
  winHeight: number,
): string {
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
  const fileStems = inputPaths.map((path, i) => {
    const fileName = path.split('/').pop();
    const fileStem = fileName.split('.').slice(0, -1).join('.');
    const fileKb = (inputSizes[i] / 1024).toFixed(1);
    return fileStem + ` ${fileKb}kb`;
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
    tableStart = `<table><thead><tr><th>${fileStems[0]}</th><th id="diffHeader"></th><th>${fileStems[1]}</th></tr></thead><tbody><tr><td>`;
    tableSeparator = '</td><td id="diffContainer"></td><td>';
    tableEnd =
      '</td></tr><tr><td colspan="3" style="text-align: center;"><button id="toggleDiff" class="diffToggle">Toggle Diff</button></td></tr></tbody></table>';
  }

  return `<!DOCTYPE html>
<html>
  <head>
    <title>Viewer-GLB</title>
    <script type="module"
      src="${modelViewerUrl}">
    </script>
    <script>
      let firstCamCall = true;
      let firstLoad = true;
      let diffPromises = null;
      const winWidth = ${winWidth};
      const winHeight = ${winHeight};

      function copyCameraParams(fromCam, toCam) {
        if (firstCamCall) {
          const fromParams = fromCam.getCameraOrbit();
          const toParams = toCam.getCameraOrbit();
          // synchronize at higher camera radius
          const radius = Math.max(fromParams.radius, toParams.radius);
          fromCam.cameraOrbit = String(fromParams.theta) + 'rad ' + String(fromParams.phi) + 'rad ' + String(radius) + 'm';
          toCam.cameraOrbit = String(toParams.theta) + 'rad ' + String(toParams.phi) + 'rad ' + String(radius) + 'm';
          firstCamCall = false;
        }
        else {
          const fromParams = fromCam.getCameraOrbit();
          const theta = String(fromParams.theta);
          const phi = String(fromParams.phi);
          const radius = String(fromParams.radius);
          toCam.cameraOrbit = theta + 'rad ' + phi + 'rad ' + radius + 'm';
        }        
      }

      // Capture viewer content to canvas
      function captureViewerToCanvas(viewer) {
        return new Promise((resolve) => {
          const canvas = document.createElement('canvas');
          canvas.width = ${width};
          canvas.height = ${height};
          const ctx = canvas.getContext('2d');
          
          // Get the internal renderer canvas from model-viewer
          const rendererCanvas = viewer.shadowRoot.querySelector('canvas');
          if (rendererCanvas) {
            ctx.drawImage(rendererCanvas, 0, 0);
            resolve(canvas);
          } else {
            // Fallback if we can't access the internal canvas
            resolve(null);
          }
        });
      }

      // Create diff image from two canvases
      function createDiffImage(canvas0, canvas1, diffCanvas) {
        if (!canvas0 || !canvas1) return;
        
        const ctx = diffCanvas.getContext('2d');
        if (!ctx) return;
        
        diffCanvas.width = ${width};
        diffCanvas.height = ${height};
        
        // Draw first image
        ctx.drawImage(canvas0, 0, 0);
        const imageData1 = ctx.getImageData(0, 0, diffCanvas.width, diffCanvas.height);
        const data0 = imageData1.data;
        
        // Draw second image
        ctx.drawImage(canvas1, 0, 0);
        const imageData2 = ctx.getImageData(0, 0, diffCanvas.width, diffCanvas.height);
        const data1 = imageData2.data;
        
        // Create diff image data
        const diffImageData = ctx.createImageData(diffCanvas.width, diffCanvas.height);
        const diffData = diffImageData.data;
        
        // Calculate diff with color coding
        for (let i = 0; i < data1.length; i += 4) {
          const r0 = data0[i + 0];
          const g0 = data0[i + 1];
          const b0 = data0[i + 2];          
          const r1 = data1[i + 0];
          const g1 = data1[i + 1];
          const b1 = data1[i + 2];
          
          // Calculate diff magnitude
          let idiff = 1.0 - Math.max(Math.abs(r1 - r0), Math.max(Math.abs(g1 - g0), Math.abs(b1 - b0))) / 255.0;
          idiff = idiff * idiff * idiff;
          const diff = 1.0 - idiff;
          idiff *= 0.5;
          // marker color
          const diffR = 255;
          const diffG = 0;
          const diffB = 255;

          // blend with diff color.
          diffData[i + 0] = (r0 * idiff + diffR * diff);
          diffData[i + 1] = (g0 * idiff + diffG * diff);
          diffData[i + 2] = (b0 * idiff + diffB * diff);
          diffData[i + 3] = 255;
        }
        
        // Draw diff image
        ctx.putImageData(diffImageData, 0, 0);
      }

      function removeDiffView() {
        // Cancel diff viewer promises
        if (diffPromises != null) {
          diffPromises.forEach(promise => {
            if (promise && typeof promise.cancel === 'function') {
              promise.cancel();
            }
          });
          diffPromises = null;
        }
        
        const diffContainer = document.getElementById('diffContainer');
        const diffHeader = document.getElementById('diffHeader');

        if (diffContainer) {
          diffContainer.innerHTML = '';
        }
        
        if (diffHeader) {
          diffHeader.textContent = '';
        }

        // Set window size to accommodate diff view
        window.resizeTo(winWidth, winHeight);
      }

      function addDiffView() {
        const viewer0 = document.getElementById('viewer0');
        const viewer1 = document.getElementById('viewer1');

        // Create image diff if we have two viewers
        if (!(viewer0 && viewer1)) {
          return;
        }

        // Set window size to accommodate diff view
        window.resizeTo(winWidth + ${width}, winHeight);

        // Set the diff header content
        const diffHeader = document.getElementById('diffHeader');
        if (diffHeader) {
          diffHeader.textContent = 'Diff';
        }
        
        // Dynamically create the diff canvas element
        const diffContainer = document.getElementById('diffContainer');
        const diffCanvas = document.createElement('canvas');
        diffCanvas.id = 'diff';
        diffCanvas.className = 'diffView';
        diffContainer.appendChild(diffCanvas);
        
        if (diffCanvas) {            
          function updateDiff() {
            if (diffPromises != null) {
              return;
            }
            diffPromises = [];
            diffPromises.push(captureViewerToCanvas(viewer0));
            diffPromises.push(captureViewerToCanvas(viewer1));

            Promise.all(diffPromises).then(([canvas0, canvas1]) => {
              createDiffImage(canvas0, canvas1, diffCanvas);
              diffPromises = null;
            });
          }

          const scheduleDiffUpdate = () => {
            if (diffPromises != null) {
              return;
            }
            setTimeout(updateDiff, 5);
          };
          viewer0.addEventListener('camera-change', scheduleDiffUpdate);
          viewer1.addEventListener('camera-change', scheduleDiffUpdate);
          // start off with fresh diff
          updateDiff();
        }
      }

      function toggleDiffView() {
        const diffHeader = document.getElementById('diffHeader');
        if (diffHeader.innerHTML == '') {
          return addDiffView();
        }
        return removeDiffView();
      }

      window.addEventListener('load', () => {
        const toggleButton = document.getElementById('toggleDiff');
        const viewer0 = document.getElementById('viewer0');
        const viewer1 = document.getElementById('viewer1');

        if (toggleButton) {
          toggleButton.addEventListener('click', toggleDiffView);
        }

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
      .diffView {
        width: ${width}px;
        height: ${height}px;
        border: 0px;
      }
      table {                
        border-collapse: collapse;
      }
      th {
        text-align: center;
        padding: 10px;
      }
      tr {
        align: center;
      }
      .diffToggle {
        display: inline-block;
        margin: 10px auto;
        padding: 8px 16px;
        background-color: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
      }
      .diffToggle:hover {
        background-color: #e0e0e0;
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
