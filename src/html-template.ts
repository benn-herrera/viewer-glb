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
    // AI the button should be on a new bottom row that spans the width of the table.
    // AI! be sure to increase the winHeight value in show-viewer.ts enough to make the bottom row of the table visible
    tableSeparator = '</td><td><canvas id="diff" class="diffView"></canvas><button id="toggleDiff" class="diffToggle">Toggle Diff</button></td><td>';
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
      function createDiffImage(canvas1, canvas2, diffCanvas) {
        if (!canvas1 || !canvas2) return;
        
        const ctx = diffCanvas.getContext('2d');
        if (!ctx) return;
        
        diffCanvas.width = ${width};
        diffCanvas.height = ${height};
        
        // Draw first image
        ctx.drawImage(canvas1, 0, 0);
        const imageData1 = ctx.getImageData(0, 0, diffCanvas.width, diffCanvas.height);
        const data1 = imageData1.data;
        
        // Draw second image
        ctx.drawImage(canvas2, 0, 0);
        const imageData2 = ctx.getImageData(0, 0, diffCanvas.width, diffCanvas.height);
        const data2 = imageData2.data;
        
        // Create diff image data
        const diffImageData = ctx.createImageData(diffCanvas.width, diffCanvas.height);
        const diffData = diffImageData.data;
        
        // Calculate diff with color coding
        for (let i = 0; i < data1.length; i += 4) {
          const r1 = data1[i];
          const g1 = data1[i + 1];
          const b1 = data1[i + 2];
          
          const r2 = data2[i];
          const g2 = data2[i + 1];
          const b2 = data2[i + 2];
          
          // Calculate absolute differences
          const diffR = Math.abs(r1 - r2);
          const diffG = Math.abs(g1 - g2);
          const diffB = Math.abs(b1 - b2);
          
          // Color code the differences:
          // - Red channel shows what's unique to first image
          // - Blue channel shows what's unique to second image
          // - Green channel shows similarities
          diffData[i] = diffR;     // Red difference
          diffData[i + 1] = 0;     // No green difference highlighting
          diffData[i + 2] = diffB; // Blue difference
          diffData[i + 3] = 255;   // Alpha
        }
        
        // Draw diff image
        ctx.putImageData(diffImageData, 0, 0);
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
          const toggleButton = document.getElementById('toggleDiff');
          
          if (diffCanvas && toggleButton) {
            // Add click handler to toggle button
            toggleButton.addEventListener('click', () => {
              console.log('View Toggle');
            });
            
            function updateDiff() {
              Promise.all([
                captureViewerToCanvas(viewer0),
                captureViewerToCanvas(viewer1)
              ]).then(([canvas1, canvas2]) => {
                createDiffImage(canvas1, canvas2, diffCanvas);
              });
            }
            
            // Update diff when either viewer finishes loading
            viewer0.addEventListener('load', updateDiff);
            viewer1.addEventListener('load', updateDiff);
            
            // Update diff on camera changes (after a short delay to allow rendering)
            let diffTimeout;
            const scheduleDiffUpdate = () => {
              clearTimeout(diffTimeout);
              diffTimeout = setTimeout(updateDiff, 200);
            };
            
            viewer0.addEventListener('camera-change', scheduleDiffUpdate);
            viewer1.addEventListener('camera-change', scheduleDiffUpdate);
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
        border: 1px solid #ccc;
      }
      h2 {
        text-align: center;
        margin: 10px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th {
        text-align: center;
        padding: 10px;
      }
      .diffToggle {
        display: block;
        margin: 10px auto 0;
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
