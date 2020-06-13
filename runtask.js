const server = require('http').createServer();
const io = require('socket.io')(server);
const process = require('child_process');
const process2  = require('process');
const tools = require('./tools');
const async = require('async');
const decode = require('decode-html');
const phpUnserialize = require('phpunserialize');
const knex = require('knex')({
    dialect: 'sqlite3',
    connection: {
        filename: './data.db',
    },
});
let port = 3303;
let datalist = {};
let wxlist = {};
process2.stdin.resume();

global.globalsetting = require('./setting.json');


let settimelist = function (uuid) {
    let pid = process.exec(`open -n ${globalsetting.appurl} --args ${uuid}`);
    wxlist[uuid] = {pid:Number(pid.pid)+1,sid:''};
    tools.echolog(getdata(uuid,'nickname'),`启动任务成功,分配进程【${Number(pid.pid)+1}】`);
};


let StartSocket = ()=>{
    console.log(`开始运行计划任务： ${port}`);
    // io.set('transports', ['websocket']);
    io.on('connection', client => {initLogin(client)});
};
let initLogin = (client) =>{
    client.on('devlogin',(data)=>{
        tools.echolog(getdata(data.uuid,'nickname'),`设备响应成功,sid:${client.id}-pid:${data.wechatpid}`);
        wxlist[data.uuid] = {pid:data.wechatpid,sid:client.id};
    });

    client.on('getUserList',(data)=>{
        let unjsondata = datalist[data.uuid];
        let content =  JSON.parse(unjsondata['configdata']);
        let jsonContent = JSON.parse(unjsondata['content']);
        let jsonUserqu = JSON.parse(unjsondata['userdata']);
        let pdata = JSON.parse(unjsondata['data']);
        let url = `${content.domain}/app/index.php?i=${jsonUserqu.uniacid}&c=entry&do=async&op=getuserpoint&m=${globalsetting.Identity}`;
        tools.resultWeb(url,{'uuid':jsonUserqu.id}).then(function (resultdata) { //请求站点用户点数
            tools.echolog(getdata(data.uuid,'nickname'),`准备就绪准备发送,pid:${data.wechatpid}`);
            let jsonUser =  JSON.parse(resultdata).data;
            let userpoint = jsonUser.point ? Number(jsonUser.point):'';
            let sentcount = 0,sendimage = 0,sendcard = 0;
            let cardname = '';
            if(jsonContent.sendcard ==='1'){
                let uncarddata = phpUnserialize(jsonContent.carddata);
                if(typeof uncarddata ==='object'){
                    if(uncarddata.cardname){
                        cardname = uncarddata.cardname;
                    }
                }
            }
            async.forEachSeries(data.list,function (item,callback) {
                if(!wxlist.hasOwnProperty(data.uuid)){
                    callback('pidnone');
                }else if(typeof userpoint === "number" && userpoint <=0){
                    callback('point');
                }else if(sentcount > jsonContent.sendcount){
                    callback('slmax');
                }else if (sentcount > content.maxsendcount){
                    callback('maxsendcount');
                }else {
                    if (jsonContent.sendtext === '1') {
                        setTimeout(function () {
                            let sendcotentX = jsonContent.content.replace(/\{username\}/g, item.nickanem);
                            io.to(client.id).emit('sendmsg', {content: sendcotentX, toid: item.toid, type: 'text'});
                            if (typeof userpoint === "number") {
                                userpoint--;
                            }
                        }, 100);
                    }

                    if (jsonContent.sendpic === '1') {
                        if (sendimage > content.sendimg) {
                            jsonContent.sendpic = '2';
                        } else {
                            setTimeout(function () {
                                io.to(client.id).emit('sendmsg', {
                                    content: data.data.image,
                                    toid: item.toid,
                                    type: 'image'
                                });
                                if (typeof userpoint === "number") {
                                    userpoint--;
                                }
                                sendimage++;
                            }, jsonContent.sendtext === '1' ? 300 : 100);
                        }
                    }

                    if (jsonContent.sendcard === '1' && cardname) {
                        if (sendcard > content.sendcard) {
                            jsonContent.sendcard = '2';
                        } else {
                            setTimeout(function () {
                                io.to(client.id).emit('sendmsg', {content: cardname, toid: item.toid, type: 'card'});
                                if (typeof userpoint === "number") {
                                    userpoint--;
                                }
                                sendcard++;
                            }, (jsonContent.sendtext === '1' && jsonContent.sendpic === '1') ? 500 : ((jsonContent.sendtext === '1' || jsonContent.sendpic === '1') ? 300 : 100));
                        }
                    }

                    if (jsonContent.sendcard === '1' || jsonContent.sendpic === '1' || jsonContent.sendtext === '1') {
                        setTimeout(function () {
                            sentcount++;
                            callback();
                        }, (jsonContent.sendtext === '1' && jsonContent.sendpic === '1' && jsonContent.sendcard === '1') ? 1000 : 800);
                    } else {
                        callback('NoFunction');
                    }
                }
            },function (err) {
                tools.echolog(getdata(data.uuid,'nickname'),`发送成功,发送${sentcount}次,结束类型${err},pid:${data.wechatpid},剩余点数${userpoint}`);
                let postResults = {
                    uniacid:jsonUserqu.uniacid,
                    time:parseInt(new Date().getTime() / 1000),
                    name:jsonUserqu.name,
                    nid:jsonUserqu.id,
                    fid:pdata.usid,
                    sname:unjsondata.nickname,
                    msgid:jsonContent.id,
                    s:sentcount
                };
                let urls = `${content.domain}/app/index.php?i=${jsonUserqu.uniacid}&c=entry&do=datas&m=cz_tk`;
                tools.resultWeb(urls,postResults).catch((postEndError)=>{
                    console.log(`提交结束参数错误:${postEndError}`);
                });
                updatestatus(data.uuid,2);
                try {
                    if (err !== 'pidnone') {
                        if (jsonContent.prize) {
                            let dataprize = eval(decode(jsonContent.prize));
                            async.forEachSeries(dataprize, function (item, callback) {
                                if (sentcount >= item.startcount && sentcount <= item.endcount) {
                                    callback(item);
                                } else {
                                    callback();
                                }
                            }, (e) => {
                                if (e === null) {
                                    async.sortBy(dataprize, function (person, callbacks) {
                                        callbacks(null, person.endcount);
                                    }, function (errs, sorted) {
                                        if (sentcount > sorted[sorted.length - 1].endcount) {
                                            sendPrize({
                                                sid: client.id,
                                                toid: pdata.username,
                                                sentcount: sentcount,
                                                prizename: sorted[sorted.length - 1].name,
                                                pidcode: data.uuid,
                                                awardtext: jsonContent.awardtext,
                                                content: jsonContent,
                                                pidata:pdata,
                                                domain:content.domain
                                            });
                                        } else {
                                            killpid(data.uuid);
                                        }
                                    });
                                } else if (typeof e === 'object') {
                                    sendPrize({
                                        sid: client.id,
                                        toid: pdata.username,
                                        sentcount: sentcount,
                                        prizename: e.name,
                                        pidcode: data.uuid,
                                        awardtext: jsonContent.awardtext,
                                        content: jsonContent,
                                        pidata:pdata,
                                        domain:content.domain
                                    });
                                } else {
                                    killpid(data.uuid);
                                }
                            });
                        } else {
                            killpid(data.uuid);
                        }
                    }
                } catch (es) {
                    tools.echolog(getdata(data.uuid,'nickname'),`解析奖品出错err:${es},pid:${data.wechatpid}`);
                }
            })
        }).catch((e)=>{
            tools.echolog(getdata(data.uuid,'nickname'),`请求站点错误 error${e},pid:${data.wechatpid}`);
        });
    });

    client.on('abnormal',(data)=>{
        //退出  //异常退出也要更新数据库
        tools.echolog(getdata(data.uuid,'nickname'),`异常退出abnormal ,pid:${data.wechatpid}`);
        killpid(data.uuid);
    });

    client.on('socketOT',(data)=>{
        if(data.type === 'loadmain'){
            //加载完成
            let resultdata = datalist[data.uuid].resultclickdata;
            if(typeof resultdata === "string"){
                resultdata = JSON.parse(resultdata);
            }
            tools.echolog(getdata(data.uuid,'nickname'),`loading界面成功,发送数据senddata,pid:${data.wechatpid}`);
            setTimeout(function () {
                io.to(client.id).emit('sendData', resultdata);
            },2000);
        }else if(data.type === 'errorMsg'){
            if(data.content.Content.match(/操作频率/) || data.content.Content.match(/重新登录/)){
                //如果触发频繁 那么这条就没用了 写入数据库 并kill
                tools.echolog(getdata(data.uuid,'nickname'),`信令异常,pid:${data.wechatpid},回调msg:${data.content.Content}`);
                updatestatus(data.uuid,4);
                killpid(data.uuid);
            }else if(data.content.Content.match(/帐号/) || data.content.Content === '你已退出微信'){
                //这里提示账号的问题 那么就手动点击
                tools.echolog(getdata(data.uuid,'nickname'),`信令超时,触发用户手动登录,pid:${data.wechatpid},回调msg:${data.content.Content}`);
                io.to(client.id).emit('rebottonlogin');
            }
        }else if(data.type === 'error'){
            //出现二维码kill
            tools.echolog(getdata(data.uuid,'nickname'),`信令失效,当前任务无效,pid:${data.wechatpid}`);
            updatestatus(data.uuid,4);
            killpid(data.uuid);
        }
    });
    client.on('loginok',(data)=>{
        //用户登录成功
        tools.echolog(getdata(data.uuid,'nickname'),`设备账户登录成功,pid:${data.wechatpid}`);
    });
    let sendPrize = function (data) {
        let url = `${data.domain}/app/index.php?i=${data.content.uniacid}&c=entry&do=async&op=insterprize&m=cz_tk`;
        let postResult = {
            msgid:data.content.id,
            content:{
                img:data.pidata.avatar,
                info:`获得"${data.prizename}"`,
                speed:6,
                name:data.pidata.nickname,
            },
        };
        tools.resultWeb(url,postResult);
        setTimeout(function () {
            io.to(data.sid).emit('sendmsg', {content:'-----完成任务-----', toid: data.toid, type: 'text'});
        },200);
        setTimeout(function () {
            io.to(data.sid).emit('sendmsg', {content:`你发送${data.sentcount}位好友,完成任务获得"${data.prizename}"。`, toid: data.toid, type: 'text'});
        },300);
        setTimeout(function () {
            io.to(data.sid).emit('sendmsg', {content:'-----end-----', toid: data.toid, type: 'text'});
        },400);
        if(data.awardtext){
            setTimeout(function () {
                io.to(data.sid).emit('sendmsg', {content:data.awardtext, toid: data.toid, type: 'text'});
            },800);
        }
        setTimeout(function () {
            killpid(data.pidcode);
        },1000)
    };
};

StartSocket();
server.listen(port);

let killpid = function (uuid) {
    try {
        knex('devdb').where('devuuid','=',uuid).update({
            sendtypesw: 1,
        }).then(()=>{
            process.exec('kill -9 '+wxlist[uuid].pid);
            delete wxlist[uuid];
            tools.echolog(getdata(uuid,'nickname'),`结束进程成功`);
        }).catch((es)=>{
            tools.echolog(getdata(uuid,'nickname'),`数据库致命错误,error:${es}`);
        });
    }catch (e) {
        tools.echolog(getdata(uuid,'nickname'),`killpid致命错误error:${e}`);
    }
};

let updatestatus = function (uuid,swtype) {
    let unjsondata = datalist[uuid];
    let config = JSON.parse(unjsondata.configdata);
    let configdata = config.senddata.getdata;
    let postdata = {
        uuid:unjsondata.username,
        uniacid:configdata.uniacid,
        msgid:configdata.mid,
        swtype:swtype
    };
    let url = `${config.domain}/app/index.php?i=${configdata.uniacid}&c=entry&do=async&op=updatesm&m=${globalsetting.Identity}`;
    tools.resultWeb(url,postdata).then(function () {
        tools.echolog(getdata(uuid,'nickname'),`更新状态成功!`);
    }).catch((e)=>{
        tools.echolog(getdata(uuid,'nickname'),`更新状态失败error:${e}`);
    });
};

let clickDb = function () {
    //启动检查
    knex.select().table('devdb').then((resultData)=>{
        resultData.forEach(function (data) {
            if(datalist.hasOwnProperty(data.devuuid)){
                // console.log(`存在${data.devuuid}`);
            }else{
                let Nowtime = parseInt(new Date().getTime() / 1000);
                let addtime = data.time;
                let totaltime = data.timeout - (Nowtime - addtime); //计算失去的时间
                tools.echolog(data.nickname,`加入队列成功(${data.devuuid}),${totaltime >0 ? `剩余${totaltime}s启动`:'准备启动'},发送状态${data.sendtypesw ===0 ? '未执行':'已执行'}。`);
                datalist[data.devuuid] = data;
                if(totaltime >= 0){
                    //还没到时间的
                    setTimeout(function () {
                        settimelist(data.devuuid);
                    },totaltime *1000);
                }else if(totaltime < 0){
                    //逝去的 检查是否已经发送过
                    if(data.sendtypesw === 0){
                        settimelist(data.devuuid);
                    }
                }

            }
        });
    });
};

let getdata = function (uuid,name=false) {
    if(name){
        return datalist[uuid][name];
    }else{
        return datalist[uuid]
    }
};


let countdown = 1000;
setInterval(function () {
    clickDb();
},countdown);



function exitHandler(options, exitCode) {
    if (options.cleanup){
        for (let exitpiddata in wxlist){
            process.exec('kill -9 '+wxlist[exitpiddata].pid);
            console.log(`结束进程退出:${wxlist[exitpiddata].pid}`);
        }
    }
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process2.exit();
}

process2.on('exit', exitHandler.bind(null,{cleanup:true}));
process2.on('SIGINT', exitHandler.bind(null, {exit:true}));
process2.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process2.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process2.on('uncaughtException', exitHandler.bind(null, {exit:true}));