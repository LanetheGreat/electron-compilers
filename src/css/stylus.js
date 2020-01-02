import path from 'path';
import detective from 'detective-stylus';
import cabinet from 'filing-cabinet';
import {CompilerBase} from '../compiler-base';
import {basename} from 'path';

const mimeTypes = ['text/stylus'];

let stylusjs = null;
let nib = null;

function each(obj, sel) {
  for (let k in obj) {
    sel(obj[k], k);
  }
}

/**
 * @access private
 */
export default class StylusCompiler extends CompilerBase {
  constructor() {
    super();

    this.compilerOptions = {
      sourcemap: 'inline',
      import: ['nib']
    };

    this.seenFilePaths = {};
  }

  static getInputMimeTypes() {
    return mimeTypes;
  }

  async shouldCompileFile(fileName, compilerContext) { // eslint-disable-line no-unused-vars
    return true;
  }

  async determineDependentFiles(sourceCode, filePath, compilerContext) { // eslint-disable-line no-unused-vars
    return this.determineDependentFilesSync(sourceCode, filePath, compilerContext);
  }

  async compile(sourceCode, filePath, compilerContext) { // eslint-disable-line no-unused-vars
    nib = nib || require('nib');
    stylusjs = stylusjs || require('stylus');
    this.seenFilePaths[path.dirname(filePath)] = true;

    let opts = this.makeOpts(filePath);
    let sourceMaps = null;

    let code = await new Promise((res,rej) => {
      let styl = stylusjs(sourceCode, opts);

      this.applyOpts(opts, styl);

      styl.render((err, css) => {
        if (err) {
          rej(err);
        } else {
          sourceMaps = styl.sourcemap;
          res(css);
        }
      });
    });

    return {
      code, sourceMaps, mimeType: 'text/css'
    };
  }

  makeOpts(filePath) {
    let opts = {
      ...this.compilerOptions,
      filename: basename(filePath)
    };

    if (opts.import && !Array.isArray(opts.import)) {
      opts.import = [opts.import];
    }

    if (opts.import && opts.import.indexOf('nib') >= 0) {
      opts.use = opts.use || [];

      if (!Array.isArray(opts.use)) {
        opts.use = [opts.use];
      }

      opts.use.push(nib());
    }

    return opts;
  }


  applyOpts(opts, stylus) {
    each(opts, (val, key) => {
      switch(key) {
      case 'set':
      case 'define':
        each(val, (v, k) => stylus[key](k, v));
        break;
      case 'include':
      case 'import':
      case 'use':
        each(val, (v) => stylus[key](v));
        break;
      }
    });

    stylus.set('paths', Object.keys(this.seenFilePaths).concat(['.']));
  }

  shouldCompileFileSync(fileName, compilerContext) { // eslint-disable-line no-unused-vars
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) { // eslint-disable-line no-unused-vars
    let dependencyFilenames = detective(sourceCode);
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
    nib = nib || require('nib');
    stylusjs = stylusjs || require('stylus');
    this.seenFilePaths[path.dirname(filePath)] = true;

    let opts = this.makeOpts(filePath),
        styl = stylusjs(sourceCode, opts);

    this.applyOpts(opts, styl);
    
    const code = styl.render(),
          sourceMaps = styl.sourcemap || null;

    return {
      code,
      sourceMaps,
      mimeType: 'text/css'
    };
  }

  getCompilerVersion() {
    return require('stylus/package.json').version;
  }
}
