'use strict';

const path = require('path');
const inquirer = require('inquirer');
const fs = require('fs');
const fse = require('fs-extra');
const glob = require('glob');
const ejs = require('ejs');
const userHome = require('user-home');

const log = require('./log');
const Command = require('./command');
const Package = require('./package');
const { spinnerStart, sleep, execAsync, getTemplate } = require('./utils');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

const SNOW_CLI_TARGET_DIR = '.snow-cli';
// 白名单命令
const WHITE_COMMAND = ['npm', 'cnpm'];


class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || '';
    this.force = !!this._cmd.force;
    log.verbose(' this.force: ',  this.force);
  }
  async exec() {
    try {
      // 1，准备阶段
      const projectInfo = await this.prepare();
      // 2、下载模板
      if (projectInfo) {
        this.projectInfo = projectInfo;
        await this.downloadTemplate();
        // 3、安装模板
        await this.installTemplate();
      }
     
    } catch (e) {
      log.error(e.message)
    }
  }

  async installTemplate () {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate();
      } else {
        throw new Error('无法识别项目模板类型！安装已终止');
      }
    } else {
      throw new Error('项目模板信息不存在！');
    }
  }

  async installNormalTemplate() {
    log.verbose('安装标准模板');
    // console.log(this.templateNpm, 'this.templateNpm');
    // console.log(this.templateNpm.cacheFilePath, 'this.templateNpm.cacheFilePath 缓存路径');
    // 拷贝模板代码至当前目录
    let spinner = spinnerStart('正在安装模板...');
    await sleep();
    const targetPath = process.TEMPLATE_PATH;
    log.verbose('targetPath: ', targetPath);
    try {
      log.verbose(this.templateNpm.cacheFilePath, 'this.templateNpm.cacheFilePath');
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
      log.verbose('templatePath:------------ ', templatePath);
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch (e) {
      throw e;
    } finally {
      spinner.stop(true);
      log.success('模板安装成功');
    }  
    const templateIgnore = this.templateInfo.ignore || [];
    const ignore = ['**/node_modules/**', '**/img/**', ...templateIgnore];
    await this.ejsRender({ ignore });
    // 如果存在yarn.lock 文件, 让用户选择是否删除
    const file = path.resolve('yarn.lock');
    let toDel = false;
    if (fs.existsSync(file)) {
      toDel = (await inquirer.prompt({
        type: 'confirm',
        name: 'toDel',
        // default: false,
        message: '存在yarn.lock 文件, 是否确定删除它？'
      })).toDel;
      log.verbose('删除yarn.lock: ', toDel);
      // 用户选否 直接终止流程
      if (toDel) {
        fse.remove(file)
          .then(() => {
            console.log(`${file} 已被删除`)
          })
          .catch(err => {
            console.error(err)
          })
      } else {
        log.warn('存在yarn.lock文件 ');
      }
      
    }
    // 安装依赖
    const { installCommand, startCommnand } = this.templateInfo;
    // 依赖安装
    await this.execCommand(installCommand, '依赖安装失败！');
    // 启动命令执行
    await this.execCommand(startCommnand, '启动执行命令失败！');
    require("child_process").exec('open http://localhost:8080');
  }
  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  async execCommand(command, errMsg) {
    let ret;
    if (command) {
      const cmdArray = command.split(' ');
      const cmd = this.checkCommand(cmdArray[0]);
      if (!cmd) {
        throw new Error('命令不存在！命令：' + command);
      }
      const args = cmdArray.slice(1);
      log.verbose(cmd, args, 'cmd, argscmd, args');
      ret = await execAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
    }
    log.verbose(ret, command + '执行成功');
    if (ret !== 0) {
      throw new Error(errMsg);
    }
    return ret;
  }
  async ejsRender(options) {
    const dir = process.cwd();
    log.verbose('ejsRender- dir: ', dir);
    const projectInfo = this.projectInfo;
    log.verbose('ejsRender----this.projectInfo: ', this.projectInfo);
    return new Promise((resolve, reject) => {
      glob('**', {
        cwd: dir,
        ignore: [ "**.png", "**.jpg", ...options?.ignore] || '',
        nodir: true,
      }, function(err, files) {
        log.verbose(files, 'files-----');
        if (err) {
          log.verbose(err,  'ejsRender glob出错了 ');
          reject(err);
        }
        Promise.all(files.map(file => {
          const filePath = path.join(dir, file);
          return new Promise((resolve1, reject1) => {
            ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
              if (err) {
                console.log(err, 'renderFile时候 出错了', filePath, 'filePath');
                reject1(err);
              } else {
                fse.writeFileSync(filePath, result);
                resolve1(result);
              }
            });
          });
        })).then(() => {
          resolve();
        }).catch(err => {
          console.log(err, 'promiseAll 捕获到的异常');
          reject(err);
        });
      });
    });
  }
  async installCustomTemplate() {
    // 查询自定义模板的入口文件
    if (await this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath();
      log.verbose('rootFile------: ', rootFile);
      if (fs.existsSync(rootFile)) {
        log.notice('开始执行自定义模板');
        const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
        const options = {
          templateInfo: this.templateInfo,
          projectInfo: this.projectInfo,
          templatePath: templatePath,
          targetPath: process.cwd(),
        };
        const code = `require('${rootFile}')(${JSON.stringify(options)})`;
        log.verbose('code', code);
        await execAsync('node', ['-e', code], { stdio: 'inherit', cwd: process.cwd() });
        log.success('自定义模板安装成功');
         // 安装依赖
        const { installCommand, startCommnand } = this.templateInfo;
        // 依赖安装
        await this.execCommand(installCommand, '依赖安装失败！');
        // 启动命令执行
        await this.execCommand(startCommnand, '启动执行命令失败！');

      } else {
        throw new Error('自定义模板入口文件不存在！');
      }
    }
  }


  async downloadTemplate () {
    log.verbose('准备阶段 拿到的 projectInfo: ', this.projectInfo);
    log.verbose('模版列表: ', this.template);
    log.snow(JSON.stringify(this.projectInfo), '我填写的信息');
    const { packageVersion: myCustomVersion } = this.projectInfo;
    const { projectTemplate } = this.projectInfo;
    if (!projectTemplate) {
      log.verbose("模板不存在!");
      process.exit(1);
    }
    const templateInfo = this.template?.find(item => item.npmName === projectTemplate);
    log.verbose('templateInfo', templateInfo);
    if (!templateInfo) {
      log.verbose("模版列表为空!");
      process.exit(1);
    }
    const { npmName, version } = templateInfo;
    const targetPath = path.resolve(userHome, SNOW_CLI_TARGET_DIR, 'template');
    const storeDir = path.resolve(userHome, SNOW_CLI_TARGET_DIR, 'template', 'node_modules');
    this.templateInfo = templateInfo;
    
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
      myCustomVersion
    });
    this.templateNpm = templateNpm;
    log.verbose(targetPath, storeDir, npmName, version, templateNpm );
    // 如果不存在直接安装npm， 如果存在直接更新
    if (!await templateNpm.exists()) {
      log.verbose('下载模板 start');
      const spinner = spinnerStart('正在下载模板...');
      await sleep(5000);
      try {
        await templateNpm.install();
        if (await templateNpm.exists()) {
          log.success('下载模板成功');
        }
      } catch (error) {
        log.error('下载模板出错了～');
        throw error;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success('下载模板end');
        }
      }
    } else {
      log.verbose('更新 start');
      const spinner = spinnerStart('正在更新模板...');
      await sleep(5000);
      try {
        await templateNpm.update();
        log.verbose('更新模板start～');
        spinner.stop(true);
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
      if (await templateNpm.exists()) {
        log.success('更新模板成功');
      }
      log.verbose('更新 end');
      }
    }
    
  }

  async prepare() {
    log.verbose('start安装模板准备阶段开始~');
    // 1，通过项目模板API获取项目模板信息
    // 1.1， 通过egg.js搭建一套后端系统
    // 1.2 通过npm 存储项目模板
    // 1.3 将项目模板存储到mongodb数据库中
    // 1.4 通过egg.js获取mongodb中的数据 并且通过API返回
    // 判断项目模板是否存在
    const template = await getTemplate();
    this.template = template;
    // console.log('template: ', template);
     // 1，判断当前目录是否为空
     const localPath = process.cwd();
     process.TEMPLATE_PATH = localPath;
     if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      // console.log(this.force, 'this.force');
      if (!this.force) {
        // 询问是否继续创建
        ifContinue = (await inquirer.prompt({
          type: 'confirm',
          name: 'ifContinue',
          // default: false,
          message: '当前文件夹不为空，是否继续创建项目？'
        })).ifContinue;
        log.verbose('ifContinue: ', ifContinue);
        // 用户选否 直接终止流程
        if (!ifContinue) {
          return;
        }
      }
      // 2. 是否启动强制更新
      if (ifContinue || this.force) {
        // 给用户做二次确认
        const { needNewDir } = await inquirer.prompt({
          type: 'confirm',
          name: 'needNewDir',
          // default: false,
          message: '是否需要下载模板到新的文件夹？',
        });
        if (needNewDir) {
          // 给用户做二次确认
        const { newDirName } = await inquirer.prompt({
          type: 'input',
          name: 'newDirName',
          message: '请输入要创建的文件名',
          default: 'template',
        });
        console.log(newDirName, 'newDirName');
        const newPath = path.resolve(localPath, newDirName);
        fse.mkdirpSync();
        process.TEMPLATE_PATH = newPath;
          // fse.removeSync();
          // log.snow('正在清空当前目录下的文件...');
          // 清空当前目录 emptyDirSync 和  removeSync区别,不会删除当前目录
          // fse.emptyDirSync(localPath);
          // log.snow('已清空当前目录 !');
        }
      }
    }
    log.verbose('安装模板准备阶段结束~');
    // 3, 选择创建项目或组件
    // 4、获取项目的基本信息
    // return 项目的基本信息
    return this.getProjectInfo();
    // throw new Error('prepare 准备阶段 -- 出错了');
  }

  async getProjectInfo() {
    function isValidName(v) {
      return /^(@[a-zA-Z0-9-_]+\/)?[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v);
    }
    let projectInfo = {};
    let isProjectNameValid = false;
    if (isValidName(this.projectName)) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName;
    }
    // 1、选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选择初始化类型',
      default: TYPE_PROJECT,
      choices: [{
        name: '项目',
        value: TYPE_PROJECT,
      }, {
        name: '组件',
        value: TYPE_COMPONENT,
      }],
    });
    const projectPrompt = [];
    log.verbose('选择创建的类型: ', type);
    const title = type === TYPE_PROJECT ? '项目' : '组件';
    this.template = [...this.template].filter(template =>
      template?.tag?.includes(type));
    if (!this.template || this.template.length === 0) {
      this.template = [{name: '没有拿到合适到模版', value:'没有合适到模版'}];
    }
  
    projectPrompt.push(
      {
        type: 'input',
        name: 'projectName',
        message: `请输入${title}名称`,
        default: '',
        validate: function(v) {
          const done = this.async();
          setTimeout(function() {
            // 1.首字符必须为英文字符
            // 2.尾字符必须为英文或数字，不能为字符
            // 3.字符仅允许"-_"
            if (!isValidName(v)) {
              done(`请输入合法的${title}名称`);
              return;
            }
            done(null, true);
          }, 0);
        },
        filter: function(v) {
          return v;
        },
      }, 
      {
        type: 'input',
        name: 'projectVersion',
        message: `请输入${title}版本号`,
        default: '1.0.0',
        // validate: function(v) {
        //   return typeof v === 'string';
        // },
        // filter: function(v) {
        //   return v;
        // }
      },
      {
        type: 'list',
        name: 'projectTemplate',
        message:`请选择${title}模板`,
        choices: this.createTemplateChoice(),
      }
    );
    if (type === TYPE_PROJECT) {
     // 2. 获取项目的基本信息
     const project = await inquirer.prompt(projectPrompt);
     projectInfo = {
       ...projectInfo,
       type,
       ...project,
     };
    } else if (type === TYPE_COMPONENT) {
      const descriptionPrompt = {
        type: 'input',
        name: 'componentDescription',
        message: '请输入组件描述信息',
        default: '',
        validate: function(v) {
          const done = this.async();
          setTimeout(function() {
            if (!v) {
              done('请输入组件描述信息');
              return;
            }
            done(null, true);
          }, 0);
        },
      };
      projectPrompt.push(descriptionPrompt);
      //  2. 获取组件的基本信息
      const component = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...component,
      };
    }
    log.verbose('projectInfo1111', projectInfo)
    // 生成className
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName;
      projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '');
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription;
    }
     // 给用户输出 项目的基本 信息
     return projectInfo;
  }

  isDirEmpty(localPath) {
    log.verbose('localPath: ', localPath);
    log.verbose("path.resolve('.')", path.resolve('.'));
    log.verbose(__dirname, '__dirname');
   
    let fileList = fs.readdirSync(localPath);
    log.verbose('fileList: ', fileList);
    // 文件过滤的逻辑
    fileList = fileList.filter(file => (
      !file.startsWith('.') && ['node_modules'].indexOf(file) < 0
    ));
    return !fileList || fileList.length <= 0;
  }

  createTemplateChoice() {
    return this.template?.map(item => ({
      value: item.npmName,
      name: item.name,
    }));
  }

}

function init(argv) {
  // log.info('argv: ', argv);
  // 环境变量 存取targetPath
  log.verbose('通过环境变量获取targetPath: ', process.env.CLI_TARGET_PATH);
  return new InitCommand(argv);
}

module.exports = init;

module.exports.InitCommand = InitCommand;
