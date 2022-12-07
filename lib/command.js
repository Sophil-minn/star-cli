'use strict';

const semver = require('semver');
const colors = require('colors/safe')
const log = require('./log');

const LOWEST_NODE_VERSION = '12.0.0'

class Command {
  constructor(argv) {
    this._argv = argv;
    if (!argv) {
      throw new Error('参数不能为空！');
    }
    if (!Array.isArray(argv)) {
      throw new Error('参数必须为数组！');
    }
    if (argv.length < 1) {
      throw new Error('参数列表为空！');
    }

    let runner = new Promise((resovle, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => this.checkNodeVersion());
      chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());
      chain.catch(err => {
        log.error(err.message);
      });
    });
  }

  initArgs() {
    // log.verbose('initArgs', this._argv);
    this._cmd = this._argv[this._argv?.length - 1];
    this._argv = this._argv.slice(0, this._argv?.length -1);
  }

  checkNodeVersion() {
    // 获取当前版本号
    log.verbose('检查node版本', process.version);
    const currentVersion = process.version;
    const lowestVersion = LOWEST_NODE_VERSION;
    // 比对最低版本号
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(colors.red(`snow-cli 需要安装v${lowestVersion}以上版本的node`));
    } else {
      log.verbose(`当前nodejs版本号为${currentVersion}!`);
    }
  }

  init() {
    throw new Error('init必须实现');
  }
  
  exec() {
    throw new Error('exec必须实现');
  }
}

module.exports = Command;
