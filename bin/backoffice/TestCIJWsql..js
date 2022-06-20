const mySQLproxy = require("../mySQLproxy.");


var mySqlConnectionOptions={
    host: "192.168.2.1",
    port:3306,
    user: "root",
    password: "*2,rdlGBail*",
    database: 'bailletarchives'

}

var connections = {};

Test= {
    numberTypes: ["float", "double", "decimal", "int"],
    stringTypes: ["char", "varchar", "text",],

    _dataModel: null,
    getConnection: function (connOptions, callback) {
        if (!connOptions)
            connOptions = mySqlConnectionOptions;
        var connectionKey = connOptions.host + ';' + connOptions.database;
        if (!connections[connectionKey]) {
            var connection = mySQLproxy.getConnection(connOptions);
        }
    }



}

Test.getConnection(mySqlConnectionOptions)