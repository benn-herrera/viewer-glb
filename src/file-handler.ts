import os from 'os';
import path from 'path';
import {copyFile as copyFileNode, rm as rmNode, mkdtempSync, readFile as readFileNode, writeFile as writeFileNode} from 'fs';
import {promisify} from 'util';
import * as fs from 'fs';

const copyFile = promisify(copyFileNode);
const rm = promisify(rmNode);
const writeFile = promisify(writeFileNode);

interface CFArgs {
  fileName: string;
  fileContent: string;
}

export class FileHandler {
  get fileDirectory(): string {
    return this._fileDirectory;
  }

  private _fileDirectory: string;

  constructor() {
    this._fileDirectory = mkdtempSync(path.join(os.tmpdir(), 'viewer-glb'));
  }
  
  async createFile({fileName, fileContent}: CFArgs): Promise<string> {
    const filePath = path.join(this._fileDirectory, fileName);
    await writeFile(
      filePath,
      fileContent, 
      'utf-8',
    );
    return filePath;
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
