import path from 'path'
import asar from 'asar'
import fse from 'fs-extra'

import { buildSync } from 'esbuild'

const { log } = console
const dest = (dir) => {
  return path.resolve(`${dir}`)
}

const packageObj = fse.readJsonSync(dest('package.json'))

export interface eleShellBuild {
  dirName?: string
  entry: string
  outDir: string
}

class EleMain {
  _configEle: eleShellBuild
  constructor(_configEle: eleShellBuild) {
    this._configEle = _configEle
  }
  // 初始化
  init() {
    fse.emptyDirSync(dest(`${this._configEle.outDir}/app`))
    fse.removeSync(
      dest(`${this._configEle.outDir}/${this._configEle.dirName}.asar`),
    )
    fse.removeSync(dest(`${this._configEle.entry}`))
  }

  mainBuilds() {
    fse.writeJsonSync(
      path.join(dest(`${this._configEle.outDir}`), 'app', 'package.json'),
      {
        name: packageObj.name || '',
        version: packageObj.version || '',
        main: packageObj.main,
      },
    )

    buildSync({
      entryPoints: [
        dest('electron/main/index.ts'),
        dest('electron/preload/index.ts'),
      ],
      bundle: true, // 配置所有的文件打包成一个文件
      platform: 'node',
      minify: true, // 配置是否压缩打包后的文件
      outdir: dest(`${this._configEle.entry}/electron`),
      target: 'chrome89',
      external: ['electron'],
    })

    const copyFront = dest(`${this._configEle.entry}`)
    const copyAfter = dest(`${this._configEle.outDir}/app/dist`)
    fse.copySync(copyFront, copyAfter)

    const copyFrontIco = dest('dfbox.ico')
    const copyAfterIco = dest(
      `${this._configEle.outDir}/app/dist/electron/main/dfbox.ico`,
    )
    fse.copySync(copyFrontIco, copyAfterIco)
    log('ASAR...')
    asar
      .createPackage(
        path.join(dest(`${this._configEle.outDir}`), 'app'),
        path.join(
          dest(`${this._configEle.outDir}`),
          `${this._configEle.dirName}.asar`,
        ),
      )
      .then(() => {
        fse.removeSync(dest(`${this._configEle.outDir}/app`))
        log('⚡ Done')
      })
  }
}

export default EleMain
