/**
 * Created by adai
 */
var through = require('through2');
var minimatch = require("minimatch");
var gutil = require('gulp-util');
var chalk = require('chalk');

// consts
const PLUGIN_NAME = 'gulp-merge-link';

module.exports = function (options, config) {
    options = options || [];
    config = config || {debug: false};

    var regLink = /{{(?:\s+|\s+.+\s+)stylesheet_link\(\s*["']?(.+\.css).*?\)(?:\s+|\s+.+\s+)}}/g;
    var regScript = /{{(?:\s+|\s+.+\s+)javascript_include\(\s*["']?(.+\.css).*?\)(?:\s+|\s+.+\s+)}}/g;

    var templateLink = function (href) {
        return '{{ stylesheet_link("' + href + '") }}';
    };
    var templateScript = function (src) {
        return '{{ javascript_include("' + src + '") }}';
    };

    var getMatch = function (reg, contents) {
        var result, matches = [];
        while (result = reg.exec(contents)) {
            matches.push({
                match: result[0],
                url: result[1].trim().replace(/^\.\//, '')
            });
        }
        return matches;
    };

    var getTemplate = function (url) {
        var isScript = /\.js$/.test(url);
        if (isScript) {
            return templateScript(url);
        }
        else {
            return templateLink(url);
        }
    };

    var log=config.debug? function () {
        gutil.log.apply(gutil,arguments);
    }: function () {
    };

    return through.obj(function (file, encoding, callback) {
        if (file.isNull() || file.isStream()) {
            return callback(null, file);
        }

        var contents = String(file.contents);
        var matches = [], key,
            match, tarUrl, srcUrls, srcUlr, i,
            replaceList = [], flag = {},
            optionsBreak;

        //matches，从文件中匹配到的引用
        matches = matches.concat(getMatch(regLink, contents)).concat(getMatch(regScript, contents));

        for (key in matches) {          //循环所有匹配到的引用，检测是否需要替换
            match = matches[key];

            for (tarUrl in options) {   //把文件中匹配的引用match 和 参数options 进行一一比对; options 相当于一个二维表记录。
                srcUrls = options[tarUrl];

                for (i = 0; i < srcUrls.length; i++) {
                    srcUlr = srcUrls[i].trim().replace(/^\.\//, '');

                    if (minimatch(match.url, srcUlr)) { //match和 options中某一行记录匹配 : 处理该match，处理完成后，可以break该match的匹配循环。
                        if (!flag[tarUrl]) {            //检测 替换后的url 是否已经被放入替换列表
                            replaceList.push({
                                match: match.match,
                                replace: getTemplate(tarUrl)
                            });
                        }
                        else {                           //如果 替换后url已经被放入替换列表 则把该match替换为空
                            replaceList.push({
                                match: match.match,
                                replace: ''
                            })
                        }

                        flag[tarUrl] = true;
                        optionsBreak = true;      //退出匹配match的循环
                        break;
                    }
                }
                if (optionsBreak) {
                    optionsBreak = false;
                    break;
                }
            }
        }

        log(file.path);
        for (i = 0; i < replaceList.length; i++) {
            contents = contents.replace(replaceList[i].match, replaceList[i].replace);
           log(chalk.green( replaceList[i].match),'-->',chalk.red(replaceList[i].replace||'delete'));
        }

        file.contents = new Buffer(contents);

        return callback(null, file);

    });
};




