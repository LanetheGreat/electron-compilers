import './test-setup.js';
import fs from 'fs';
import path from 'path';

describe('compile all synchronously', function() {
  const compilerGroups = {
    css: {
      expected: {
        mimeType: 'text/css',
        codeType: 'string'
      },
      ctx: {},
      compilers: {
        less: new allCompilers.LessCompiler(),
        sass: new allCompilers.SassCompiler(),
        scss: new allCompilers.SassCompiler(),
        stylus: new allCompilers.StylusCompiler()
      },
      exts: {
        stylus: 'styl'
      },
      options: {
        stylus: { 'import': ['nib'], 'sourcemap': 'inline' }
      }
    },
    html: {
      expected: {
        mimeType: 'text/html',
        codeType: 'string'
      },
      ctx: {},
      compilers: {
        inline_html: allCompilers.InlineHtmlCompiler.createFromCompilers(compilersByMimeType),
        jade: new allCompilers.JadeCompiler(),
        pug: new allCompilers.PugCompiler(),
        vue: allCompilers.VueCompiler.createFromCompilers(compilersByMimeType)
      },
      exts: {
        inline_html: 'html'
      },
      options: {}
    },
    javascript: {
      expected: {
        mimeType: 'application/javascript',
        codeType: 'string'
      },
      ctx: {},
      compilers: {
        babel_js: new allCompilers.BabelCompiler(),
        babel_jsx: new allCompilers.BabelCompiler(),
        coffeescript: new allCompilers.CoffeeScriptCompiler(),
        graphql: new allCompilers.GraphQLCompiler(),
        typescript: new allCompilers.TypeScriptCompiler(),
      },
      exts: {
        babel_js: 'js',
        babel_jsx: 'jsx',
        coffeescript: 'coffee',
        typescript: 'ts'
      },
      options: {
        babel_js: {
          "presets": ["@babel/preset-env"],
          "plugins": ["@babel/plugin-transform-async-to-generator"],
          "sourceMaps": "inline"
        },
        babel_jsx: {
          "presets": ["@babel/preset-env", "@babel/preset-react"],
          "plugins": ["@babel/plugin-transform-async-to-generator"],
          "sourceMaps": "inline"
        }
      }
    },
    json: {
      expected: {
        mimeType: 'application/json',
        codeType: 'string'
      },
      ctx: {},
      compilers: {
        cson: new allCompilers.CSONCompiler()
      },
      exts: {},
      options: {}
    }
  };
  compilerGroups.html.compilers.vue.expected = {
    mimeType: 'application/javascript',
    codeType: 'string'
  };
  
  /* Remove sass.js's "unhandledRejection" event listener (abort function),
  because it leads to Promise rejections causing "uncaughtException"
  error handling that kills mocha mid-testing. */
  beforeEach(function() {
   for(let listener of process.listeners('unhandledRejection')) {
     if(listener.name === 'abort')
       process.removeListener('unhandledRejection', listener);
   }
 });

  for(let [groupName, group] of Object.entries(compilerGroups)) {
    describe(`should compile ${groupName}`, function() {
      const { compilers, exts } = group;

      for(let name in compilers) {
        it(`${compilers[name].constructor.name} can compile test.${exts[name] || name}`, function() {
          const filePath = path.join(__dirname, 'fixtures', `test.${exts[name] || name}`);
          const source = fs.readFileSync(filePath, 'utf8');
          const compiler = compilers[name];
          compiler.compilerOptions = group.options[name] || {};

          const shouldCompile = compiler.shouldCompileFile(filePath, group.ctx);
          expect(shouldCompile).to.be.ok;

          let result = compiler.compileSync(source, filePath, group.ctx);
          expect(result.mimeType).to.equal((compiler.expected || group.expected).mimeType);
          expect(typeof(result.code)).to.equal((compiler.expected || group.expected).codeType);
        });
      }
    });
  }
});
