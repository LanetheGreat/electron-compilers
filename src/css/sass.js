import path from 'path';
import fs from 'fs';
import toutSuite from 'toutsuite';
import detectiveSASS from 'detective-sass';
import detectiveSCSS from 'detective-scss';
import cabinet from 'filing-cabinet';
import {CompilerBase} from '../compiler-base';

const mimeTypes = ['text/sass', 'text/scss'];
const resolve = (loc) => path.resolve(loc.replace(/^\/sass\//, ''));
let sass = null;

function dedupe(arr) {
  const set = arr.reduce(
    (values, value) => {
      values[value] = true;
      return values;
    },
    {}
  );
  return Object.keys(set);
}

/**
 * @access private
 */
export default class SassCompiler extends CompilerBase {
  constructor() {
    super();

    this.compilerOptions = {
      comments: true,
      sourceMapEmbed: true,
      sourceMapContents: true
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

  async determineDependentFiles(sourceCode, filePath, compilerContext) {
    return this.determineDependentFilesSync(sourceCode, filePath, compilerContext);
  }

  async compile(sourceCode, filePath, compilerContext) { // eslint-disable-line no-unused-vars
    sass = sass || this.getSass();

    const paths = this.determineImportPaths(filePath);
    sass.importer(this.buildImporterCallback(paths));

    let opts = {
      ...this.compilerOptions,
      indentedSyntax: filePath.match(/\.sass$/i),
      sourceMapRoot: filePath,
    };

    let result = await new Promise((res,rej) => {
      sass.compile(sourceCode, opts, (r) => {
        if (r.status !== 0) {
          rej(new Error(r.formatted || r.message));
          return;
        }

        res(r);
        return;
      });
    });

    let source = result.text;

    // NB: If you compile a file that is solely imports, its
    // actual content is '' yet it is a valid file. '' is not
    // truthy, so we're going to replace it with a string that
    // is truthy.
    if (!source) {
      source = ' ';
    }

    return {
      code: source,
      sourceMaps: result.map || null,
      dependencies: dedupe(result.files || [])
        .map(resolve)
        .sort(),
      mimeType: 'text/css'
    };
  }

  shouldCompileFileSync(fileName, compilerContext) { // eslint-disable-line no-unused-vars
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) { // eslint-disable-line no-unused-vars
    let dependencyFilenames = path.extname(filePath) === '.sass' ? detectiveSASS(sourceCode) : detectiveSCSS(sourceCode);
    let dependencies = [];

    for (let dependencyName of dependencyFilenames) {
      dependencies.push(cabinet({
        partial: dependencyName,
        filename: filePath,
        directory: path.dirname(filePath)
      }));
    }

    return dependencies;
  }

  compileSync(sourceCode, filePath, compilerContext) { // eslint-disable-line no-unused-vars
    sass = sass || this.getSass();

    const paths = this.determineImportPaths(filePath);
    sass.importer(this.buildImporterCallback(paths));

    let opts = {
      ...this.compilerOptions,
      indentedSyntax: filePath.match(/\.sass$/i),
      sourceMapRoot: filePath,
    };

    let result;
    toutSuite(() => {
      sass.compile(sourceCode, opts, (r) => {
        if (r.status !== 0) {
          throw new Error(r.formatted || r.message);
        }
        result = r;
      });
    });

    let source = result.text;

    // NB: If you compile a file that is solely imports, its
    // actual content is '' yet it is a valid file. '' is not
    // truthy, so we're going to replace it with a string that
    // is truthy.
    if (!source) {
      source = ' ';
    }

    return {
      code: source,
      sourceMaps: result.map || null,
      dependencies: dedupe(result.files || [])
        .map(resolve)
        .sort(),
      mimeType: 'text/css'
    };
  }

  getSass() {
    let ret;
    toutSuite(() => ret = require('sass.js/dist/sass.node').Sass);

    /* Remove sass.js's "unhandledRejection" event listener (abort function),
     because it leads to Promise rejections causing "uncaughtException"
     error handling that kills mocha mid-testing. */
    for(let listener of process.listeners('unhandledRejection')) {
      if(listener.name === 'abort')
        process.removeListener('unhandledRejection', listener);
    }

    return ret;
  }

  buildImporterCallback (includePaths) {
    const self = this;
    return (function (request, done) {
      let file;
      if (request.file) {
        done();
        return;
      } else {
        // sass.js works in the '/sass/' directory
        const cleanedRequestPath = request.resolved.replace(/^\/sass\//, '');
        const cleanedPrevPath = request.previous.replace(/^\/sass\//, '');
        const cleanedIncludes = [...includePaths];

        if (request.previous !== 'stdin')
          cleanedIncludes.unshift(path.dirname(cleanedPrevPath));

        for (let includePath of cleanedIncludes) {
          const filePath = path.resolve(includePath, cleanedRequestPath);
          let variations = sass.getPathVariations(filePath);

          file = variations
            .map(self.fixWindowsPath.bind(self))
            .reduce(self.importedFileReducer.bind(self), null);

          if (file) {
            const content = fs.readFileSync(file, { encoding: 'utf8' });
            return sass.writeFile(file, content, () => {
              done({ path: file });
              return;
            });
          }
        }

        if (!file) {
          done();
          return;
        }
      }
    });
  }

  importedFileReducer(found, path) {
    // Find the first variation that actually exists
    if (found) return found;

    try {
      const stat = fs.statSync(path);
      if (!stat.isFile()) return null;
      return path;
    } catch(e) {
      return null;
    }
  }

  fixWindowsPath(file) {
    // Unfortunately, there's a bug in sass.js that seems to ignore the different
    // path separators across platforms

    // For some reason, some files have a leading slash that we need to get rid of
    if (process.platform === 'win32' && file[0] === '/') {
      file = file.slice(1);
    }

    // Sass.js generates paths such as `_C:\myPath\file.sass` instead of `C:\myPath\_file.sass`
    if (file[0] === '_') {
      const parts = file.slice(1).split(path.sep);
      const dir = parts.slice(0, -1).join(path.sep);
      const fileName = parts.reverse()[0];
      file = path.resolve(dir, '_' + fileName);
    }
    return file;
  }

  getCompilerVersion() {
    return require('sass.js/package.json').libsass;
  }
}
