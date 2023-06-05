const axios = require('../api.request');
const getGithubRepoList = () => {
    return axios.request({
        url: 'https://api.github.com/users/simposons/repos',
        params: { per_page: 100 },
        method: 'get'
    })
}
const getGiteeRepoList = () => {
    return axios.request({
        url: 'https://gitee.com/api/v5/users/chenxigg/repos',
        params: { per_page: 100 },
        method: 'get'
    })
}
const getGitlabRepoList = () => {
    return axios.request({
        url: 'http://10.0.16.158:8090/api/v4/projects',
        params: { per_page: 100 },
        method: 'get'
    })
}

module.exports = {
    getGithubRepoList,
    getGiteeRepoList,
    getGitlabRepoList
}