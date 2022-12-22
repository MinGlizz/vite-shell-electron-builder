import path from 'path'
import asar from 'asar'
import fse from 'fs-extra'

import { buildSync } from 'esbuild'

const { log } = console
const dest = (dir) => {
  return path.resolve(`${dir}`) //path.join(__dirname, `../${dir}`)
}

const packageObj = fse.readJsonSync(dest('package.json'))
// const dependenciesArr = ['adm-zip', 'fs-extra']

export interface eleShellBuild {
  dirName?: string
  dependencies: string[]
  entry: string
  outDir: string
}

class EleMain {
  // dependenciesArr: string[]
  _configEle: eleShellBuild
  constructor(_configEle: eleShellBuild) {
    // this.dependenciesArr = _configEle.dependencies
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
  //  读取文件目录
  async GetFileAll(fIlesDir: string) {
    return new Promise<string[]>((resolve, reject) => {
      fse.readdir(`${dest(fIlesDir)}`, (err, files: string[]) => {
        if (err) reject(err)
        resolve(files)
      })
    })
  }

  // 复制迁移相关依赖
  copyFile(filesName) {
    log('⠋', filesName)
    const copyFront = dest(`node_modules/${filesName}`)
    const copyAfter = dest(
      `${this._configEle.outDir} /app/node_modules/${filesName}`,
    )
    if (!fse.existsSync(copyAfter)) {
      fse.copySync(copyFront, copyAfter)
    }
  }

  filterDependenciesName(dependenciesList): string[] {
    if (dependenciesList.length === 0) return []
    return dependenciesList.map((item) => {
      if (item.includes('@')) {
        return item.split('/')[0]
      }
      return item
    })
  }
  // 注意丢失依赖
  async installMove(fileAddress: string, relyOnArr: string[] = []) {
    if (relyOnArr.length === 0) {
      relyOnArr = await this.GetFileAll(`node_modules/${fileAddress}`)
    }
    if (fileAddress.includes('@')) {
      this.copyFile(fileAddress)
      return
    }
    if (relyOnArr.includes('package.json')) {
      // 开始迁移
      const packageJson = fse.readJsonSync(
        // path.join(__dirname, `../node_modules/${fileAddress}/package.json`),
        dest(`node_modules/${fileAddress}/package.json`),
      )
      let packageDependencies: string[] = []
      if (packageJson.dependencies) {
        packageDependencies = Object.getOwnPropertyNames(
          packageJson.dependencies,
        )
      }
      this.copyFile(fileAddress)
      if (packageDependencies.length > 0) {
        // eslint-disable-next-line no-use-before-define
        await this.mainBuild(packageDependencies)
      }
    } else {
      this.filterDependenciesName(relyOnArr).forEach((relyOnName) => {
        this.installMove(`${fileAddress}/${relyOnName}`)
      })
    }
  }
  // 入口
  async mainBuild(dependenciesList) {
    return new Promise<void>((resolve) => {
      const filterDependenciesList: string[] =
        this.filterDependenciesName(dependenciesList)
      const data: string[] = [...new Set(filterDependenciesList)]
      const fn: Promise<void>[] = []
      data.forEach((filesName: string) => {
        fn.push(this.installMove(filesName))
      })
      Promise.all(fn).then(() => {
        resolve()
      })
    })
  }

  mainBuilds() {
    this.mainBuild(this._configEle.dependencies).then(() => {
      // package迁移
      fse.writeJsonSync(
        path.join(dest(`${this._configEle.outDir}`), 'app', 'package.json'),
        {
          name: packageObj.name || '',
          version: packageObj.version || '',
          main: packageObj.main,
        },
      )

      // 编译主进程代码
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      buildSync({
        entryPoints: [
          dest('electron/main/index.ts'),
          dest('electron/preload/index.ts'),
          // path.join(__dirname, '../electron/main/index.ts'),
          // path.join(__dirname, '../electron/preload/index.ts'),
        ],
        bundle: true, // 配置所有的文件打包成一个文件
        platform: 'node',
        minify: true, // 配置是否压缩打包后的文件
        outdir: dest(`${this._configEle.entry}/electron`), //path.join(__dirname, '../dist/electron'),
        target: 'chrome89',
        external: ['electron'],
      })

      // dist迁移
      const copyFront = dest(`${this._configEle.entry}`)
      const copyAfter = dest(`${this._configEle.outDir}/app/dist`)
      fse.copySync(copyFront, copyAfter)
      // join(__dirname, '')
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
    })
  }
}

export default EleMain
