import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import detective from 'detective-less';
import cabinet from 'filing-cabinet';
import {CompilerBase} from '../compiler-base';
import toutSuite from 'toutsuite';

const mimeTypes = ['text/less'];
const resolve = (loc) => path.resolve(loc);
const readFile = promisify(fs.readFile);
let lessjs = null;

/**
 * @access private
 */
export default class LessCompiler extends CompilerBase {
  constructor() {
    super();

    this.compilerOptions = {
      sourceMap: { sourceMapFileInline: true }
    };

    // Add all the possible node_module paths to look in.
    this.libraryPaths = require.resolve.paths('').reduce(
      (paths, path) => {
        paths[path] = true;
        return paths;
      }, {}
    );

    // Use an object instead of an array to maintain search order when adding/re-adding new paths.
    this.seenFilePaths = {};
  }

  static getInputMimeTypes() {
    return mimeTypes;
  }
  
  determineImportPaths(filePath) {
    if (filePath) {
      let thisPath = path.dirname(filePath);
      this.seenFilePaths[thisPath] = true;
    }

    // Search order starts with current compiling file's directory.
    let paths = Object.keys(this.seenFilePaths);

    // Next any user specified file paths. (works as overrides)
    if (this.compilerOptions.paths) {
      paths.push(...this.compilerOptions.paths);
    }

    // Then finally the cwd (aka project directory) and the node_modules' paths.
    paths.push(process.cwd());
    paths.push(...Object.keys(this.libraryPaths));

    return paths;
  }

  async shouldCompileFile(fileName, compilerContext) { // eslint-disable-line no-unused-vars
    return true;
  }

  async determineDependentFiles(sourceCode, filePath, compilerContext, fileSet={}) {
    const dependencyFilenames = detective(sourceCode);

    for (let dependencyName of dependencyFilenames) {
      const dependencyFilepath = cabinet({
        partial: dependencyName,
        filename: filePath,
        directory: this.determineImportPaths(filePath)
      });
      const dependencySource = await readFile(dependencyFilepath, 'utf-8');

      fileSet[dependencyFilepath] = true;
      await this.determineDependentFiles(dependencySource, dependencyFilepath, compilerContext, fileSet);
    }

    return Object.keys(fileSet).sort();
  }

  async compile(sourceCode, filePath, compilerContext) { // eslint-disable-line no-unused-vars
    lessjs = lessjs || this.getLess();

    const paths = this.determineImportPaths(filePath);
    let opts = {
      ...this.compilerOptions,
      paths,
      filename: path.basename(filePath)
    };

    let result = await lessjs.render(sourceCode, opts);
    let source = result.css;

    // NB: If you compile a file that is solely imports, its
    // actual content is '' yet it is a valid file. '' is not
    // truthy, so we're going to replace it with a string that
    // is truthy.
    if (!source && typeof source === 'string') {
      source = ' ';
    }

    return {
      code: source,
      sourceMaps: result.map || null,
      dependencies: (result.imports || [])
        .map(resolve)
        .sort(),
      mimeType: 'text/css'
    };
  }

  shouldCompileFileSync(fileName, compilerContext) { // eslint-disable-line no-unused-vars
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext, fileSet={}) { // eslint-disable-line no-unused-vars
    const dependencyFilenames = detective(sourceCode);

    for (let dependencyName of dependencyFilenames) {
      const dependencyFilepath = cabinet({
        partial: dependencyName,
        filename: filePath,
        directory: this.determineImportPaths(filePath)
      });
      const dependencySource = fs.readFileSync(dependencyFilepath, 'utf-8');

      fileSet[dependencyFilepath] = true;
      this.determineDependentFilesSync(dependencySource, dependencyFilepath, compilerContext, fileSet);
    }

    return Object.keys(fileSet).sort();
  }

  compileSync(sourceCode, filePath, compilerContext) { // eslint-disable-line no-unused-vars
    lessjs = lessjs || this.getLess();

    let source, map, imports;
    let error = null;

    const paths = this.determineImportPaths(filePath);
    let opts = {
      ...this.compilerOptions,
      paths,
      filename: path.basename(filePath),
      fileAsync: false, async: false, syncImport: true
    };

    toutSuite(() => {
      lessjs.render(sourceCode, opts, (err, out) => {
        if (err) {
          error = err;
        } else {
          // NB: Because we've forced less to work in sync mode, we can do this
          source = out.css;
          map = out.map || null;
          imports = (out.imports || [])
            .map(resolve)
            .sort();
        }
      });
    });

    if (error) {
      throw error;
    }

    // NB: If you compile a file that is solely imports, its
    // actual content is '' yet it is a valid file. '' is not
    // truthy, so we're going to replace it with a string that
    // is truthy.
    if (!source && typeof source === 'string') {
      source = ' ';
    }

    return {
      code: source,
      sourceMaps: map,
      dependencies: imports,
      mimeType: 'text/css'
    };
  }

  getLess() {
    let ret;
    toutSuite(() => ret = require('less'));
    return ret;
  }

  getCompilerVersion() {
    return require('less/package.json').version;
  }
}
