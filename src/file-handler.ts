import os from 'os';
import path from 'path';
import {copyFile as copyFileNode, rm as rmNode, mkdtempSync, writeFile as writeFileNode} from 'fs';
import {promisify} from 'util';

const copyFile = promisify(copyFileNode);
const rm = promisify(rmNode);
const writeFile = promisify(writeFileNode);

export class FileHandler {
  get fileDirectory(): string {
    return this._fileDirectory;
  }

  private _fileDirectory: string;

  constructor() {
    this._fileDirectory = mkdtempSync(path.join(os.tmpdir(), 'screenshot-glb'));
  }

  async createFile(filePath: string, fileContents: string): Promise<void> {
    const fullPath = path.join(this._fileDirectory, filePath);
    await writeFile(fullPath, fileContents, 'utf8');
  }

  async addFile(filePath: string): Promise<string> {
    const fileName = path.basename(filePath);
    await copyFile(
      path.resolve(filePath),
      path.join(this._fileDirectory, fileName),
    );
    return fileName;
  }

  async destroy() {
    await rm(this._fileDirectory, {recursive: true});
  }
}
