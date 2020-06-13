const tools = require('./tools');
const http = require('http');
const multiparty = require('multiparty');
global.dbinfo = {
    host: '',
    user: '',
    password: '',
    database: 'wechatCoreUser',
    port:'3306'
};
const mysql = require('./mysql.js');
let host = '0.0.0.0';
let port = 86;

http.createServer((req, res)=>{
    res.writeHead(200, {
        "Content-Type": "text/plain;charset=UTF-8",
        'Access-Control-Allow-Origin': '*'
    });
    if (req.url === '/postform' && req.method === 'POST') {
        let form = new multiparty.Form();
        form.parse(req, function(err, fields, files) {
            if(fields){
                mysql.fordbSetting(fields['clinekey'],(result)=>{
                   if(result){
                       //update
                       let UpdateUser = 'update usermanar set weshoporder=?,domain=?,ip=?,devcount=?,sendimg=?,sendcard=?,process=?,scan=?,maxsendcount=?,endtime=?,cost=?,status=?,addtime=?,webname=?,sendok=?  where id=?';
                       mysql.ckdb(UpdateUser, [
                           fields['weshoporder'],
                           fields['domain'],
                           fields['ip'],
                           fields['devcount'],
                           fields['sendimg'],
                           fields['sendcard'],
                           fields['process'],
                           fields['scan'],
                           fields['maxsendcount'],
                           tools.time(new Date(fields['endtime']).getTime()),
                           Number(fields['cost']).toFixed(2),
                           fields['status'],
                           tools.time(new Date()),
                           fields['webname'],
                           fields['sendok'],
                           result.id,
                       ], function (UpdateUserErr, UpdateUserResult) {
                           if (UpdateUserResult) {
                               res.write(JSON.stringify({resultType:'success',message:'提交成功',code:200}));
                               res.end();
                           } else if (UpdateUserErr) {
                               res.write(JSON.stringify({resultType:'error',message:addUserErr,code:404}));
                               res.end();
                           }
                       });
                   }else{
                       //add
                       let adduser = 'insert into usermanar(weshoporder,clinekey,domain,ip,devcount,sendimg,sendcard,process,scan,maxsendcount,endtime,cost,status,addtime,webname,sendok) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
                       mysql.ckdb(adduser,[fields['weshoporder'],fields['clinekey'],fields['domain'],fields['ip'],fields['devcount'],fields['sendimg'],fields['sendcard'],fields['process'],fields['scan'],fields['maxsendcount'],tools.time(new Date(fields['endtime']).getTime()),Number(fields['cost']).toFixed(2),fields['status'],tools.time(new Date()),fields['webname'],fields['sendok']], function (addUserErr, addUserResult) {
                           if(addUserResult){
                               res.write(JSON.stringify({resultType:'success',message:'提交成功',code:200}));
                               res.end();
                           }else if(addUserErr){
                               res.write(JSON.stringify({resultType:'error',message:addUserErr,code:404}));
                               res.end();
                           }
                       });
                   }
                });
            }else{
                res.write(JSON.stringify({resultType:'error'}));
                res.end();
            }
        });
    }else if(req.url === '/getlist' && req.method === 'GET'){
        mysql.fordbSetting(false,(result)=>{
            res.write(JSON.stringify({resultType:'success',message:'获取成功',status:200,data:result}));
            res.end();
        },'all');

    }else{
        res.write('无效路由');
        res.end();
    }
}).listen(port, host);
console.log(`server ${host}:${port}`);