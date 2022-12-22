import type { PluginOption } from 'vite'
import EleMain, { eleShellBuild } from './main'

export default function vitePluginTemplate(
  _configEle: eleShellBuild | undefined = {
    dirName: 'app',
    entry: 'dist',
    outDir: 'build',
  },
): PluginOption {
  const eleBuild = new EleMain(_configEle)
  return {
    name: 'vite-plugin-template',
    enforce: 'pre', // post
    apply: 'build',
    config() {
      eleBuild.init()
    },
    closeBundle() {
      eleBuild.mainBuilds()
    },
  }
}
