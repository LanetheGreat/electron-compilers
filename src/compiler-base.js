/**
 * This class is the base interface for compilers that are used by
 * electron-compile. If your compiler library only supports a
 * synchronous API, use SimpleCompilerBase instead.
 *
 * @interface
 */
export class CompilerBase {
  constructor() {
    this.compilerOptions = {};
  }

  /**
   * This method describes the MIME types that your compiler supports as input.
   * Many precompiled file types don't have a specific MIME type, so if it's not
   * recognized by the mime-types package, you need to patch rig-mime-types in
   * electron-compile.
   *
   * @return {string[]}  An array of MIME types that this compiler can compile.
   *
   * @abstract
   */
  static getInputMimeTypes() {
    throw new Error("Implement me!");
  }


  /**
   * Returns a calculated list of paths that will be searched during imports.
   *
   * @param  {string} fileName  The full path of a file to compile.
   * @return {string[]}         A array of folder paths, or an empty
   *                            array if there are no import folders.
   *
   * @abstract
   */
  determineImportPaths(filePath) { // eslint-disable-line no-unused-vars
    throw new Error("Implement me!");
  }


  /**
   * Determines whether a file should be compiled
   *
   * @param  {string} fileName        The full path of a file to compile.
   * @param  {object} compilerContext An object that compilers can add extra
                                    information to as part of a job - the caller
                                    won't do anything with this.
   * @return {Promise<bool>}        True if you are able to compile this file.
   *
   * @abstract
   */
  async shouldCompileFile(fileName, compilerContext) { // eslint-disable-line no-unused-vars
    throw new Error("Implement me!");
  }


  /**
   * Returns the dependent files of this file. This is used for languages such
   * as LESS which allow you to import / reference other related files. This is
   * needed so that electron-compile, can trigger a hot-reload on pages with
   * resources that depend on children files that have changed.
   *
   * @param  {string} sourceCode    The contents of filePath
   * @param  {string} fileName        The full path of a file to compile.
   * @param  {object} compilerContext An object that compilers can add extra
                                    information to as part of a job - the caller
                                    won't do anything with this.
   * @return {Promise<string[]>}    An array of dependent file paths, or an empty
   *                                array if there are no dependent files.
   *
   * @abstract
   */
  async determineDependentFiles(sourceCode, fileName, compilerContext) { // eslint-disable-line no-unused-vars
    throw new Error("Implement me!");
  }


  /**
   * Compiles the file
   *
   * @param  {string} sourceCode    The contents of filePath
   * @param  {string} fileName      The full path of a file to compile.
   * @param  {object} compilerContext An object that compilers can add extra
                                    information to as part of a job - the caller
                                    won't do anything with this.
   * @return {Promise<object>}      An object representing the compiled result
   * @property {string} code        The compiled code
   * @property {string} mimeType    The MIME type of the compiled result, which
   *                                should exist in the mime-types database.
   * @property {object} sourceMaps  An object containing the v3 source maps if
   *                                any are provided by the compiler.
   * @property {string[]} dependencies A sorted array of dependent file paths,
   *                                or an empty array if there are no dependent
   *                                files.
   *
   * @abstract
   */
  async compile(sourceCode, fileName, compilerContext) { // eslint-disable-line no-unused-vars
    throw new Error("Implement me!");
  }

  shouldCompileFileSync(fileName, compilerContext) { // eslint-disable-line no-unused-vars
    throw new Error("Implement me!");
  }

  determineDependentFilesSync(sourceCode, fileName, compilerContext) { // eslint-disable-line no-unused-vars
    throw new Error("Implement me!");
  }

  compileSync(sourceCode, fileName, compilerContext) { // eslint-disable-line no-unused-vars
    throw new Error("Implement me!");
  }

  /**
   * Returns a version number representing the version of the underlying
   * compiler library. When this number changes, electron-compile knows
   * to throw all away its generated code.
   *
   * @return {string}  A version number. Note that this string isn't
   *                   parsed in any way, just compared to the previous
   *                   one for equality.
   *
   * @abstract
   */
  getCompilerVersion() {
    throw new Error("Implement me!");
  }
}


/**
 * This class implements all of the async methods of CompilerBase by just
 * calling the sync version. Use it to save some time when implementing
 * simple compilers.
 *
 * To use it, implement the compile method, the getCompilerVersion method,
 * and the getInputMimeTypes static method.
 *
 * @abstract
 */
export class SimpleCompilerBase extends CompilerBase {
  constructor() {
    super();
  }

  determineImportPaths(filePath) { // eslint-disable-line no-unused-vars
    return [process.cwd()];
  }

  async shouldCompileFile(fileName, compilerContext) { // eslint-disable-line no-unused-vars
    return true;
  }

  async determineDependentFiles(sourceCode, filePath, compilerContext) { // eslint-disable-line no-unused-vars
    return [];
  }

  async compile(sourceCode, filePath, compilerContext) {
    return this.compileSync(sourceCode, filePath, compilerContext);
  }

  shouldCompileFileSync(fileName, compilerContext) { // eslint-disable-line no-unused-vars
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) { // eslint-disable-line no-unused-vars
    return [];
  }
}
