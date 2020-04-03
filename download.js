const url = require('url');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
/*美观的打印输出*/
const chalk = require('chalk');
/*美观的命令行界面*/
const inquirer = require('inquirer');
/*美观的终端下载*/
const ora = require('ora');
/*美观的终端进度条*/
const ProgressBar = require('progress');


class Download {
    constructor({
                    pathUrl = '',
                    username = '',
                    repos = '',
                    branch = '',
                    file = '',
                    protocol = ''
                } = {}) {

        console.log(pathUrl, username, 'asdsad');
        this._spinner = ora('开始下载');
        /*要下载到哪个路径*/
        this.exportBaseUrl = path.join(process.cwd(), pathUrl);
        /*用户名*/
        this.username = username;
        /*仓库名*/
        this.repos = repos;
        /*分支*/
        this.branch = branch;
        /*下载胡文件*/
        this.file = file;
        /*协议*/
        this.protocol = protocol;
    }

    download(url) {
        /*解码包含特殊字符*/
        const BaseUrl = decodeURI(url);
        if (!BaseUrl) {
            return console.log(chalk.red('url is required!'));
        }
        this.parseUrl(BaseUrl);
    }

    parseUrl(BaseUrl) {
        const {path, protocol} = url.parse(BaseUrl);

        const infoList = path.split('/');

        const [, username, repos] = infoList;

        const [branch = 'master', download] = this.getBranchFile(path, infoList);

        this.username = username;
        this.repos = repos;
        this.branch = branch;
        this.file = download;
        this.protocol = protocol;

        this.isExistDir()
    }

    getBranchFile(path, infoList) {
        const file = [];
        let includeSwitch = false;
        /*github路劲的固定的结构，这两个不会同时出现在路径里*/
        ['/tree/', '/blob/'].some(item => {
            if (path.includes(item) && !includeSwitch) {
                includeSwitch = true;
                file[0] = infoList[4];
                const list = path.split(item);
                file[1] = list[1].split('/')[1];
                return true
            }
        });
        return file
    }

    isExistDir() {

        const currentRepos = path.join(process.cwd(), this.repos);

        /*判断路劲是否存在*/
        if (fs.existsSync(currentRepos)) {
            inquirer.prompt([{
                type: 'list',
                name: 'type',
                message: `你当前目录存在 '${this.repos}'? 是否继续?`,
                choices: [
                    '继续',
                    '取消'
                ]
            }]).then(answers => {
                if (answers.type === '继续') {
                    this.requestUrl();
                }
            });
        } else {
            this.requestUrl();
        }
    }

    requestUrl() {
        this._spinner.start();
        this._spinner.color = 'yellow';
        this._spinner.text = '下载中...';
        /*获取一个资源*/
        // /repos/:owner/:repo/contents/:path
        /*递归获取资源*/
        //  /repos/:owner/:repo/git/trees/:tree_sha
        // 'https://github.com/repos/xfxhn/httpServer/git/trees/master?recursive=1'
        const url = `${this.protocol}//api.github.com/repos/${this.username}/${this.repos}/git/trees/${this.branch}?recursive=1`;
        /*这个API下载的是整个仓库*/
        console.log(url)
        axios.get(url).then(res => {
            const trees = res.data.tree;

            this.filterFile(trees);
        }).catch(e => {
            console.log(e.code);
            this._spinner.stop();
            console.log(chalk.red(`network is error!`));
        })
    }


    filterFile(tree) {

        let filterList = tree.filter(item => item.type === 'blob');
        if (this.file !== '') {
            /*过滤出要下载的文件,以要下载的文件开头的*/
            filterList = filterList.filter(item => {
                const downRepl = this.file.replace(/\//g, '\\\/').replace(/\./g, '\\\.');
                const reg = new RegExp(`^${downRepl}`);
                return reg.test(item.path);
            })
        }
        this._spinner.stop();
        this.bar = new ProgressBar(':bar :current/:total', {
            total: filterList.length
        });

        filterList.forEach(item => this.downloadFile(item.path));
    }

    downloadFile(url) {

        const exportUrl = path.join(this.exportBaseUrl, this.repos, url);

        /*这里返回上级目录是要避免把最底层那个文件也创建出来*/
        this.mkdirs(path.dirname(exportUrl));
        // console.log(`https://github.com/${username}/${repos}/raw/${branch}/${url}`)

        axios.get(`https://github.com/${this.username}/${this.repos}/raw/${this.branch}/${url}`, {
            responseType: 'stream'
        }).then(res => {
            this.bar.tick();
            console.log(chalk.green(`  正在下载${repos}`));
            res.data.pipe(fs.createWriteStream(exportUrl))
        }).catch(err => {
            console.log('第二个错误', err.code)
        })
    }

    mkdirs(dirname) {
        if (fs.existsSync(dirname)) {
            return true;
        }
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
}


module.exports = Download;


