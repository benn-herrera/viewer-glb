# 📸 viewer-glb

Easily view 1 or compare 2 GLB models interactively.

This utility is derived from [@shopify/screenshot-glb](https://github.com/Shopify/screenshot-glb)

<img width="2032" height="960" alt="image" src="https://github.com/user-attachments/assets/6effe8e9-c605-4b4c-9792-13c4c2bc1998" />

## Install

Use npm to install this tool:
Download a [built node package](https://github.com/benn-herrera/viewer-glb/releases)
`npm install [release_package.tgz]`

## Usage

```sh
% viewer-glb --help
viewer-glb

Positionals:
  input0  glTF 2.0 binary (GLB) filepath                     (required) [string]
  input1  glTF 2.0 binary (GLB) filepath                                [string]

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
  -c, --color            background color (defaults to transparent, accepts HEX
                         or RGB)                                        [string]
      --environment_map  HDR environment map image, neutral, or legacy  [string]
      --exposure         exposure in stops                 [number] [default: 0]
  -w, --width            viewer width                    [number] [default: 512]
  -h, --height           viewer height                   [number] [default: 512]
  -d, --debug            Enable Debug Mode            [boolean] [default: false]
  -v, --verbose          Enable verbose logging       [boolean] [default: false]
```

## Dependencies

The module relies on using [puppeteer](https://www.npmjs.com/package/puppeteer) to spawn an instance of Chrome to use Google's [<model-viewer>](https://github.com/GoogleWebComponents/model-viewer) web component with the GLB model loaded.

## Development

- `yarn install`
- `yarn link`
- `viewer-glb test/fixtures/<MODEL>`

## Examples

```
// view 1 model
% viewer-glb <PATH_TO_MODEL>

// compare 2 models side by side
% viewer-glb <PATH_TO_MODEL0> <PATH_TO_MODEL1>

// Specify view width and height
$ viewer-glb <PATH_TO_MODEL> --width 600 --height 1200

// NOTE: width and height are for 1 viewer. When doing side by side comparison the total window is twice as wide
$ viewer-glb <PATH_TO_MODEL0> <PATH_TO_MODEL1> --width 600 --height 1200

// Change the environment image and exposure in photographic stops (powers of 2)
$ viewer-glb <PATH_TO_MODEL> --exposure -1.0 --environment_map <PATH_TO_EQUIRECT_HDR>
```
