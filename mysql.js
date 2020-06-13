const mysql = require('mysql');
function createMySQLClient(){
    try{
        return mysql.createConnection(dbinfo).on('error',function (err) {
            console.log(err);
        })
    }catch (e) {
        console.log('连接数据库失败: '+e);
        return false;
    }
}
module.exports = {
    ProcessCk:function(sql,params){
        return new Promise((resolve, reject) => {
            var mysqlclient = createMySQLClient();
            mysqlclient.query(sql, params, function (err, rows) {
                mysqlclient.end();
                if(rows) resolve(rows);
                if(err) reject(err);
            });
        })
    },
    ckdb: function (sql, params = false,callback) {
        var mysqlclient = createMySQLClient();
        mysqlclient.query(sql, params, function (err, rows) {
            mysqlclient.end();
            return callback(err,rows);
        });
    },
    fordbSetting:function (condition=false,callback,name=false)  {
        if(name == 'all'){
            var settingSql = 'select * from usermanar ';
        }else{
            var settingSql = 'select * from usermanar where clinekey=?';
        }
        this.ckdb(settingSql,[condition],function (err,result) {
            if(err){
                console.log('err>>>'+err);
            }else{
                if(name =='all'){
                    return callback(result);
                }else if(name){
                    return callback(result[0][name]);
                }else{
                    return callback(result[0]);
                }
            }
        });
    }
};

