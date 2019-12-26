
import chai from 'chai';

global.compilerClasses = require('../lib/main');
global.allCompilers = global.compilerClasses.reduce(
  (compilers, compiler) => Object.assign(compilers, {[compiler.name]: compiler}),
  {}
);
global.expect = chai.expect;
global.assert = chai.assert;

global.compilersByMimeType = compilerClasses.reduce((mimeTypes, compiler) => 
  Object.assign(mimeTypes, compiler.getInputMimeTypes().reduce((types, type) =>
    Object.assign(types, {[type]: new compiler()}),
    {}
  )),
  {}
);

global.compilersByMimeType['application/javascript'].compilerOptions = {
  "presets": ["@babel/preset-env", "@babel/preset-react"],
  "sourceMaps": "inline"
};
global.compilersByMimeType['text/coffeescript'].compilerOptions = { sourceMap: true };

global.compilersByMimeType['text/css'] = global.compilersByMimeType['text/plain'];
global.compilersByMimeType['text/html'] = allCompilers.InlineHtmlCompiler.createFromCompilers(global.compilersByMimeType);
global.compilersByMimeType['text/vue'] = allCompilers.VueCompiler.createFromCompilers(global.compilersByMimeType);