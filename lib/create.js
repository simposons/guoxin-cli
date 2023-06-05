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
        this.description = '';
    }

    async create() {
        if(!this.projectName) await this.setProjectName();
        const isOverwrite = await this.handleDirectory();
        if (!isOverwrite) return;
        await this.setDescription();
        const chooseGit = await this.handleGitPath();
        await this.getCollectRepo(chooseGit);
    }
    // 设置描述 description
    async setProjectName() {
        let { projectName } = await new Inquirer.prompt([
            {
                name: 'projectName',
                type: 'input',
                message: '请输入项目名称',
                validate(val) {
                    if (!val) {
                        return '项目名称是必填的'
                    } else {
                        return true
                    }
                }
            }
        ]);
        this.projectName = projectName
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
                    console.log(`\r\n 移除完成`);
                } else {
                    console.log(chalk.red.bold('不覆盖文件夹，创建终止'));
                    return false;
                }
            }
        };
        return true;
    }
    // 设置描述 description
    async setDescription() {
        let { description } = await new Inquirer.prompt([
            {
                name: 'description',
                type: 'input',
                message: '请输入项目描述信息',
            }
        ]);
        this.description = description
    }
    // 选择下载源 gitee github
    async handleGitPath() {
        let { chooseGit } = await new Inquirer.prompt([
            {
                name: 'chooseGit',
                type: 'list',
                message: '请选择拉取源',
                choices: [
                    {
                        name: 'gitlab(推荐)',
                        value: 'gitlab'
                    },
                    {
                        name: 'gitee',
                        value: 'gitee'
                    },
                    {
                        name: 'github',
                        value: 'github'
                    }
                ]
            }
        ]);
        return chooseGit;
    }
    // 获取可拉取的仓库列表
    async getCollectRepo(chooseGit) {
        const loading = ora('正在获取模版信息...');
        loading.start();
        const repoList = {
            gitlab: 'getGitlabRepoList',
            gitee: 'getGiteeRepoList',
            github: 'getGithubRepoList'
        }
        const { data: list } = await api[repoList[chooseGit]]();
        let collectTemplateNameList = '';
        if (chooseGit == 'gitlab') {
            collectTemplateNameList = list.filter(item => {
                return item.name_with_namespace.includes('project-cli')
            }).map(item => {
                return {
                    name: item.name, value: `${item.http_url_to_repo}`
                }
            })
        } else if (chooseGit == 'gitee') {
            collectTemplateNameList = list.filter(item => {
                return item.project_labels.map((_item) => {
                    return _item.name
                }).includes('guoxin')
            }).map(item => { return { name: item.name, value: item.html_url } })
        } else if (chooseGit == 'github') {
            collectTemplateNameList = list
                .filter(item => item.topics.includes('guoxin'))
                .map(item => { return { name: item.name, value: item.clone_url } })
        }
        loading.succeed();
        let { choiceTemplateGitPath } = await new Inquirer.prompt([
            {
                name: 'choiceTemplateGitPath',
                type: 'list',
                message: '请选择模版',
                choices: collectTemplateNameList
            }
        ]);
        this.downloadTemplate(choiceTemplateGitPath);
    }
    // 下载仓库
    async downloadTemplate(choiceTemplateGitPath) {
        this.downloadGitRepo = util.promisify(downloadGitRepo);
        const templateUrl = `direct:${choiceTemplateGitPath}#main`;
        const loading = ora('正在拉取模版...');
        loading.start();
        await this.downloadGitRepo(templateUrl, path.join(cwd, this.projectName), { clone: true }, (err) => {
            if (err) {
                loading.fail();
                console.log('executeDownload error ==', err);
                process.exit();
            } else {
                loading.succeed();
                this.setPackageContent();
                this.showTemplateHelp();
            }
        })
    }
    setPackageContent(){
        const data={
            name:this.projectName,
            description:this.description
        }
        const jsonPath = `${this.projectName}/package.json`
        let jsonContent = fs.readFileSync(jsonPath, 'utf-8')
        jsonContent = JSON.parse(jsonContent);
        jsonContent = Object.assign({},jsonContent,data);
        fs.writeFileSync(jsonPath, JSON.stringify(jsonContent,"","\t"))
    }
    // 模版使用提示
    showTemplateHelp() {
        console.log(`\r\nSuccessfully created project ${chalk.cyan(this.projectName)}`);
        console.log(`\r\n  cd ${chalk.cyan(this.projectName)}\r\n`);
        console.log("  npm install");
        console.log("  npm run dev\r\n");
        console.log(`
            ${chalk.green.bold(
            figlet.textSync(this.projectName,
                {
                    font: "Standard",
                    horizontalLayout: "default",
                    verticalLayout: "default",
                    width: 60,
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