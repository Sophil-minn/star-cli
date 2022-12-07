'use strict';

const path = require('path');
const Package = require('./package');
const log = require('./log');
const { exec: spawn } = require('./utils');

const SETTINGS = {
  'init': "@snowlepoard/init"
}

const CACHE_DIR = 'dependencies/';

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH;
  log.verbose('targetPath: ', targetPath || '您没有输入targetPath属性,默认使用缓存路径');
  const homePath = process.env.CLI_HOME_PATH;
  let storeDir = '';
  let pkg = '';
  log.verbose('homePath: ', homePath);
  // log.verbose('---------', arguments, '-------------');
  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  log.verbose('cmdName: ', cmdName);
  const packageName = SETTINGS[cmdName];
  const packageVersion = 'latest';
  log.verbose('packageName: ', packageName);

  if (!targetPath) {
    // 生成缓存路径
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, 'node_modules');
    log.verbose('默认的targetPath', targetPath);
    log.verbose('缓存目录storeDir', storeDir);
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion
    });
    if( await pkg.exists()) {
      await pkg.update();
    } else {
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion
    });
  }
  log.verbose('pkg入口文件: ', pkg.getRootFilePath());
  log.verbose('判断当前package是否存在: ', await pkg.exists());
  log.verbose('CLI_HOME_PATH: ', process.env.CLI_HOME_PATH);

  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    // try {
    //   // 当前进程中调用，无法充分利用CPU资源
    // require(rootFile).call(null, Array.from(arguments));
    // console.log('Array.from(arguments): ', Array.from(arguments));
    // 改造成 在node子进程中调用，可以额外的获取更多的CPU资源， 以便获得更高的性能
      const args =  Array.from(arguments);
      const cmd = args[args.length -1];
      const o = Object.create(null);
      Object.keys(cmd).forEach(key => {
        if (cmd.hasOwnProperty(key) && 
        key !== 'parent') {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;
    //   // 兼容   windows
    const code = ` require('${rootFile.replace(/\\/g, '\\\\')}').call(null, ${JSON.stringify(args)});`;
    //   // const code = ` require(${rootFile});`;
    //   // win sp.spawn('cmd', ['/c', 'node, '-e', code]);
      log.verbose('child process.cwd()-----');
      const child = spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit'
      });
      child.on('error', e => {
        log.error(e.message, '出错了------');
        process.exit(1);
      });
      child.on('exit', e => {
        log.verbose('命令退出：' + e );
        process.exit(e);
      });
    //   // child.stdout.on('data', function (chunk) {
    //   //   console.log('stdout', chunk.toString());
    //   // });
    //   // child.stderr.on('data', function (chunk) {
    //   //   console.log('stderr', chunk.toString());
    //   // });
    // } catch (error) {
    //   console.log(error, 'error');/*  */
    // }
  }
  
}

module.exports = exec;