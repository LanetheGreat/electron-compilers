import './test-setup.js';
import fs from 'fs';
import path from 'path';

/* eslint-disable no-undef */
const ctx = {};
const compilerGroups = [
  {
    name: 'less',
    ext: 'less',
    compiler: allCompilers.LessCompiler,
    libImport: "@import 'milligram-less/dist/milligram';"
  },
  {
    name: 'sass',
    ext: 'sass',
    compiler: allCompilers.SassCompiler,
    libImport: "@import 'milligram-sass/dist/milligram'"
  },
  {
    name: 'scss',
    ext: 'scss',
    compiler: allCompilers.SassCompiler,
    libImport: "@import 'milligram-scss/dist/milligram';"
  },
  {
    name: 'stylus',
    ext: 'styl',
    compiler: allCompilers.StylusCompiler,
    libImport: "@import 'milligram-stylus/dist/milligram'"
  }
];

describe('correct import ordering synchronously', function() {
  describe('CSS should import current directory files first', function() {
    compilerGroups.forEach((group) => {
      it(`${group.name} compiler`, function() {
        const compiler = new group.compiler();
        const filePath = path.join(__dirname, 'fixtures', 'sibling-import', `test-import.${group.ext}`);
        const importPath = path.join(__dirname, 'fixtures', 'sibling-import', `milligram-${group.name}`, 'dist', `_Color.${group.ext}`);
        const source = fs.readFileSync(filePath, 'utf-8');
        const result = compiler.compileSync(source, filePath, ctx);
        const cssExist = result.code.split('\n').reduce((res, line) => res || line.startsWith('.fake_fixture'));

        expect(result.dependencies).to.include(importPath);
        expect(cssExist).to.be.ok;
      });
    });
  });

  describe('CSS should import project file next', function() {
    compilerGroups.forEach((group) => {
      it(`${group.name} compiler`, function() {
        const compiler = new group.compiler();
        const filePath = path.join(__dirname, 'fixtures', 'project-import', `test-import.${group.ext}`);
        const importPath = path.resolve('test', 'fixtures', 'imports', group.name, `_Color.${group.ext}`);
        const source = fs.readFileSync(filePath, 'utf-8');
        const result = compiler.compileSync(source, filePath, ctx);
        const cssExist = result.code.split('\n').reduce((res, line) => res || line.startsWith('.fake_fixture'));

        expect(result.dependencies).to.include(importPath);
        expect(cssExist).to.be.ok;
      });
    });
  });

  describe('CSS should import library file last', function() {
    compilerGroups.forEach((group) => {
      it(`${group.name} compiler`, function() {
        const compiler = new group.compiler();
        const filePath = path.join(__dirname, 'fixtures', 'library-import', `test-import.${group.ext}`);
        const importPath = require.resolve(`milligram-${group.name}/dist/_Color.${group.ext}`);
        const source = fs.readFileSync(filePath, 'utf-8');
        const result = compiler.compileSync(source, filePath, ctx);
        const cssExist = result.code.split('\n').reduce((res, line) => res || line.startsWith('.fake_fixture'));

        expect(result.dependencies).to.include(importPath);
        expect(cssExist).to.be.ok;
      });
    });
  });

  describe('CSS node_modules library compiles correctly', function() {
    compilerGroups.forEach((group) => {
      it(`${group.name} compiler`, function() {
        const compiler = new group.compiler();
        const filePath = path.resolve(`_fakeFile.${group.ext}`);
        const importPath = require.resolve(`milligram-${group.name}/dist/milligram.${group.ext}`);
        const source = group.libImport;
        const result = compiler.compileSync(source, filePath, ctx);

        expect(result.dependencies).to.include(importPath);
        expect(result.code).to.be.ok;
      });
    });
  });

  describe('CSS should have no duplicate imports', function() {
    compilerGroups.forEach((group) => {
      it(`${group.name} compiler`, function() {
        const compiler = new group.compiler();
        const filePath = path.join(__dirname, 'fixtures', 'multiple-import', `test-import.${group.ext}`);
        const source = fs.readFileSync(filePath, 'utf-8');
        const result = compiler.compileSync(source, filePath, ctx);

        expect(result.dependencies.length).to.equal(dedupe(result.dependencies).length);
      });
    });
  });
});


describe('correctly determineDependentFiles import paths synchronously', function() {
  describe('CSS dependencies current directory file first', function() {
    compilerGroups.forEach((group) => {
      it(`${group.name} compiler`, function() {
        const filePath = path.join(__dirname, 'fixtures', 'sibling-import', `test-import.${group.ext}`);
        const source = fs.readFileSync(filePath, 'utf-8');
        const result = (new group.compiler()).compileSync(source, filePath, ctx);
        const dependencies = (new group.compiler()).determineDependentFilesSync(source, filePath, ctx);

        expect(dependencies).to.deep.equal(result.dependencies);
      });
    });
  });

  describe('CSS dependencies project file next', function() {
    compilerGroups.forEach((group) => {
      it(`${group.name} compiler`, function() {
        const filePath = path.join(__dirname, 'fixtures', 'project-import', `test-import.${group.ext}`);
        const source = fs.readFileSync(filePath, 'utf-8');
        const result = (new group.compiler()).compileSync(source, filePath, ctx);
        const dependencies = (new group.compiler()).determineDependentFilesSync(source, filePath, ctx);

        expect(dependencies).to.deep.equal(result.dependencies);
      });
    });
  });

  describe('CSS dependencies library file last', function() {
    compilerGroups.forEach((group) => {
      it(`${group.name} compiler`, function() {
        const filePath = path.join(__dirname, 'fixtures', 'library-import', `test-import.${group.ext}`);
        const source = fs.readFileSync(filePath, 'utf-8');
        const result = (new group.compiler()).compileSync(source, filePath, ctx);
        const dependencies = (new group.compiler()).determineDependentFilesSync(source, filePath, ctx);

        expect(dependencies).to.deep.equal(result.dependencies);
      });
    });
  });

  describe('CSS node_modules library compiles correctly', function() {
    compilerGroups.forEach((group) => {
      it(`${group.name} compiler can compile milligram-${group.name}`, function() {
        const filePath = path.resolve(`_fakeFile.${group.ext}`);
        const source = group.libImport;
        const result = (new group.compiler()).compileSync(source, filePath, ctx);
        const dependencies = (new group.compiler()).determineDependentFilesSync(source, filePath, ctx);

        expect(dependencies).to.deep.equal(result.dependencies);
      });
    });
  });

  describe('CSS should have no duplicate imports', function() {
    compilerGroups.forEach((group) => {
      it(`${group.name} compiler`, function() {
        const filePath = path.join(__dirname, 'fixtures', 'multiple-import', `test-import.${group.ext}`);
        const source = fs.readFileSync(filePath, 'utf-8');
        const dependencies = (new group.compiler()).determineDependentFilesSync(source, filePath, ctx);

        expect(dependencies.length).to.be.ok;
        expect(dependencies.length).to.equal(dedupe(dependencies).length);
      });
    });
  });
});
