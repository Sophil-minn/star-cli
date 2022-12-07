exports.templateList = [
  {
    version: '1.0.1',
    name: 'vue标准模板',
    npmName: 'snow-cli-template-vue2',
    type: 'normal',
    installCommand: 'npm install',
    startCommnand: 'npm run start',
    ignore: [ '**/public/**' ],
    tag: [ 'project' ]
  },
  // {
  //   version: '1.0.0',
  //   name: 'vue2 管理后端模版',
  //   npmName: 'snow-cli-template-vue-element-admin',
  //   type: 'normal',
  //   installCommand: 'npm install',
  //   startCommnand: 'npm start',
  //   ignore: [ '**/public/**' ],
  //   tag: [ 'project' ]
  // },
  {
    version: '1.1.6',
    name: 'vue自定义极简模板',
    npmName: 'snow-cli-template-custom',
    type: 'custom',
    installCommand: 'npm install',
    startCommnand: 'npm run serve',
    ignore: [ '**/public/**' ],
    tag: [ 'project' ]
  },
  {
    version: '1.2.0',
    name: 'react默认路由配置模板',
    npmName: 'snow-react-withroute-template',
    type: 'normal',
    installCommand: 'npm install',
    startCommnand: 'npm run start',
    ignore: [ '**/public/**' ],
    tag: [ 'project' ]
  },
  // {
  //   version: '1.1.1',
  //   name: 'react 组件库 模版',
  //   npmName: 'snow-cli-storybook-component-template',
  //   type: 'normal',
  //   installCommand: 'npm install',
  //   startCommnand: 'npm run storybook',
  //   ignore: [ '**/public/**' ],
  //   tag: [ 'component' ]
  // },
  {
    version: '1.1.0',
    name: '乐高 组件库 模版',
    npmName: 'snow-cli-lego-template',
    type: 'normal',
    installCommand: 'yarn install',
    startCommnand: 'yarn start',
    ignore: [ '**/public/**' , '**/.png'],
    tag: [ 'component' ]
  },
  {
    version: '1.0.0',
    name: '不存在的模版测试用',
    npmName: 'imooc-cli-dev-lego-template',
    type: 'normal',
    installCommand: 'npm install',
    startCommnand: 'npm start',
    ignore: [ '**/public/**' , '**/.png'],
    tag: [ 'component' ]
  },
]