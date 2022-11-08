import fs from 'fs'
import path from 'path'
import shell from 'shelljs'
import lsFiles from 'node-ls-files'
import { readJOSN, writeJOSN, cleanDir } from './utils/utils.js'

class Builder {
  #libDir = path.join(__dirname, '../lib')
  #rootDir = path.resolve('./src')
  #tempTSConfig = path.join(this.#libDir, './tsconfig.json')

  dev(): void {
    this.#getTSConfig()
    this.#runCmd('cjs', {
      watch: true,
    })
  }

  build(): void {
    this.#getTSConfig()
    this.#runCmd('cjs')

    const outputDir = this.#runCmd('mjs')
    const files = lsFiles.sync(outputDir, {
      filter: /\.m?js$/,
    })

    files.forEach((file) => this.#prependNodeCode(file))
    this.#removeTSConfig()
  }

  #runCmd(type: 'cjs' | 'mjs', { watch = false } = {}): string {
    const outDir = path.resolve(`./dist-${type}`)
    const tscFile = path.join(this.#libDir, `./tsconfig-${type}.json`)

    const options = [
      `--project ${tscFile}`,
      `--rootDir ${this.#rootDir}`,
      `--baseUrl ${this.#rootDir}`,
      `--outDir ${outDir}`,
      watch && ' -w',
    ]

    cleanDir(outDir)
    this.#addPackageData(outDir, type === 'cjs' ? 'commonjs' : 'module')

    const optimizeOptions = options.filter((o) => o).join(' ')
    shell.exec('tsc ' + optimizeOptions, { async: watch })

    return outDir
  }

  #addPackageData(outDir: string, type: 'commonjs' | 'module'): void {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

    const target = path.join(outDir, './package.json')
    writeJOSN(target, { type })
  }

  #prependNodeCode(file: string): void {
    let data = fs.readFileSync(file, 'utf-8')
    const dirNameRegex = /('|")use __dirname('|");?/gm
    const fileNameRegex = /('|")use __filename('|");?/gm
    const isUsingAnything = dirNameRegex.test(data) || fileNameRegex.test(data)
    if (!isUsingAnything) return

    fs.writeFileSync(
      file,
      this.#__nodeCode +
        data
          .replace(dirNameRegex, this.#__nodeCode__dirname)
          .replace(fileNameRegex, this.#__nodeCode__filename)
    )
  }

  #getTSConfig() {
    const userTscPath = path.resolve('./tsconfig.json')

    const userTsc = readJOSN(userTscPath)
    const libTsc = readJOSN(this.#tempTSConfig)

    libTsc.extends = './tsconfig-core.json'
    libTsc.include = [this.#rootDir]
    libTsc.compilerOptions = userTsc.compilerOptions

    writeJOSN(this.#tempTSConfig, libTsc)
  }

  #removeTSConfig() {
    fs.rmSync(this.#tempTSConfig)
  }

  #__nodeCode = `import{fileURLToPath as ______fIlE___UrL___tO___pATh______}from'url';`
  #__nodeCode__filename = `let __filename=______fIlE___UrL___tO___pATh______(import.meta.url);`
  #__nodeCode__dirname = `let __dirname=______fIlE___UrL___tO___pATh______(new URL('.',import.meta.url));`
}

export default Builder