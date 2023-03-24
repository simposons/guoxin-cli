const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const Inquirer = require('inquirer');
const ora = require('ora');
const api = require('./api/interface/index');
const util = require('util');
const downloadGitRepo = require('download-git-repo');
const figlet = require('figlet');
const cwd = process.cwd();
class Creator {
    constructor(projectName, options) {
        this.projectName = projectName;
        this.options = options;
    }

    async create() {
        const isOverwrite = await this.handleDirectory();
        if (!isOverwrite) return;
        console.log('todo....');
        await this.getCollectRepo();
    }
    // 处理是否有相同目录
    async handleDirectory() {
        const targetDirectory = path.join(cwd, this.projectName);
        // 如果目录中存在了需要创建的目录
        if (fs.existsSync(targetDirectory)) {
            if (this.options.force) {
                await fs.remove(targetDirectory);
            } else {
                let { isOverwrite } = await new Inquirer.prompt([
                    {
                        name: 'isOverwrite',
                        type: 'list',
                        message: '是否强制覆盖已存在的同名目录？',
                        choices: [
                            {
                                name: '覆盖',
                                value: true
                            },
                            {
                                name: '不覆盖',
                                value: false
                            }
                        ]
                    }
                ]);
                if (isOverwrite) {
                    console.log(`\r\n 正在移除...`);
                    await fs.remove(targetDirectory);
                } else {
                    console.log(chalk.red.bold('不覆盖文件夹，创建终止'));
                    return false;
                }
            }
        };
        return true;
    }
    // 获取可拉取的仓库列表
    async getCollectRepo() {
        const loading = ora('正在获取模版信息...');
        loading.start();
        const { data: list } = await api.getRepoList({ per_page: 100 });
        loading.succeed();
        const collectTemplateNameList = list.filter(item => item.topics.includes('guoxin')).map(item => item.name);
        let { choiceTemplateName } = await new Inquirer.prompt([
            {
                name: 'choiceTemplateName',
                type: 'list',
                message: '请选择模版',
                choices: collectTemplateNameList
            }
        ]);
        console.log('选择了模版：' + choiceTemplateName);
        this.downloadTemplate(choiceTemplateName);
    }
    // 下载仓库
    async downloadTemplate(choiceTemplateName) {
        this.downloadGitRepo = util.promisify(downloadGitRepo);
        const templateUrl = `shenyWill/${choiceTemplateName}`;
        const loading = ora('正在拉取模版...');
        loading.start();
        await this.downloadGitRepo(templateUrl, path.join(cwd, this.projectName));
        loading.succeed();
        this.showTemplateHelp();
    }
     // 模版使用提示
     showTemplateHelp() {
        console.log(`\r\nSuccessfully created project ${chalk.cyan(this.projectName)}`);
        console.log(`\r\n  cd ${chalk.cyan(this.projectName)}\r\n`);
        console.log("  npm install");
        console.log("  npm run dev\r\n");
        console.log(`
            \r\n
            ${chalk.green.bold(
                figlet.textSync("gx-mPaas", { 
                    font: "isometric4",
                    horizontalLayout: "default",
                    verticalLayout: "default",
                    width: 80,
                    whitespaceBreak: true,
                  })
            )}
        `)
    }
}

module.exports = async function (projectName, options) {
    const creator = new Creator(projectName, options);
    await creator.create();
}