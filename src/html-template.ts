import {getModelViewerUrl} from './get-model-viewer-url';

type AttributesObject = {[key: string]: any};

export interface TemplateViewerOptions {
  modelViewerUrl: string;
  width: number;
  height: number;
  inputPaths: string[];
  backgroundColor: string;
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

function validateCustomAttributes(
  defaultAttributes: AttributesObject,
  customAttributes: AttributesObject | undefined,
) {
  if (!customAttributes) {
    return;
  }

  Object.keys(defaultAttributes).forEach((defaultAttributeKey) => {
    if (customAttributes[defaultAttributeKey] !== undefined) {
      if (errorMessagesForAttributeKey[defaultAttributeKey]) {
        throw new Error(errorMessagesForAttributeKey[defaultAttributeKey]);
      }

      throw new Error(`You cannot pass \`${defaultAttributeKey}\``);
    }
  });
}

export function htmlTemplate({
  modelViewerUrl,
  width,
  height,
  inputPaths,
  backgroundColor,
  devicePixelRatio,
  modelViewerArgs,
}: TemplateViewerOptions): string {
  const defaultAttributes = {
    id: 'snapshot-viewer',
    style: `background-color: ${backgroundColor};`,
    'interaction-prompt': 'none',
    src: inputPaths[0],
  };

  validateCustomAttributes(defaultAttributes, modelViewerArgs);

  const input0AttributesString = toHTMLAttributeString(defaultAttributes);
  let input1AttributesString: string
  if (inputPaths.length > 1) {
    defaultAttributes.src = inputPaths[1]
    input1AttributesString = toHTMLAttributeString(defaultAttributes)
  }
  const modelViewerArgsString = toHTMLAttributeString(modelViewerArgs);


  // AI! 
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=${devicePixelRatio}">
    <script type="module"
      src="${modelViewerUrl}">
    </script>
    <script>
      window.addEventListener('load', () => {
        window.resizeTo(${width}, ${height});
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
    <model-viewer
      camera-controls
      ${input0AttributesString}
      ${modelViewerArgsString}
    />
  </body>
</html>
`;
}
