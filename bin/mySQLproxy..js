var mysql = require('mysql');
//var nodeMaria = require('node-mariadb');

var mySqlConnectionOptions={
    host: "localhost",
    port:7202,
    user: "bailletarchives",
    password: "nodeApp55",
    database: 'bailletarchives_test'

}
var mySqlConnectionOptionsXX={
    host: "localhost",
    port:3306,
    user: "root",
    password: "vi0lon",
    database: 'bailletarchives'
}

var connections = {};
var mySQLproxy = {

    numberTypes: ["float", "double", "decimal", "int"],
    stringTypes: ["char", "varchar", "text",],

    _dataModel: null,
    getConnection: function (connOptions, callback) {
        if (!connOptions)
            connOptions = mySqlConnectionOptions;
        var connectionKey = connOptions.host + ';' + connOptions.database;
        if (!connections[connectionKey]) {
            var connection = mysql.createConnection(connOptions);

            connection.connect(function (err) {
                if (err)
                    return callback(err);
                console.log("Connected!");
                connections[connectionKey] = connection;
                callback(null, connection);
            });
        } else
            callback(null, connections[connectionKey]);
    },


    exec: function (connection, sql, callback) {


        mySQLproxy.getConnection(connection, function (err, conn) {
            if (err)
                return callback(err);

            conn.query(sql, function (err, result) {
                if (err)
                    return callback(err);
                return callback(null, result);
            });
        });

    },

    datamodel: function (connection, callback) {
        // var excludedTables=["users","r_versement_magasin"];
        var excludedTables = [];
        mySQLproxy.getConnection(connection, function (err, conn) {
            if (err)
                return callback(err);
            var sql = "SELECT * FROM information_schema.columns where table_schema=\"" + connection.database + "\""
            conn.query(sql, function (err, result) {
                if (err)
                    return callback(err);


                var model = {};
                result.forEach(function (line) {
                    if (line.TABLE_NAME.indexOf("r_") == 0 || excludedTables.indexOf(line.TABLE_NAME) > -1)//relation
                        ;
                    else {
                        if (!model[line.TABLE_NAME])
                            model[line.TABLE_NAME] = [];

                        model[line.TABLE_NAME].push({
                            name: line.COLUMN_NAME,
                            columnType: line.COLUMN_TYPE,
                            dataType: line.DATA_TYPE,
                            nullable: line.IS_NULLABLE,
                            defaultValue: line.COLUMN_DEFAULT,
                            maxLength: line.CHARACTER_MAXIMUM_LENGTH,
                            numericScale: line.NUMERIC_SCALE
                        })
                    }
                })
                mySQLproxy._dataModel = model;
                return callback(null, model);
            });
        });


    },
    getFieldType: function (table, fieldName) {

        var type;

        mySQLproxy._dataModel[table].forEach(function (field) {
            if (field.name == fieldName)
                type = field.dataType;
        })

        if (mySQLproxy.numberTypes.indexOf(type) > -1)
            return "number";
        if (mySQLproxy.stringTypes.indexOf(type) > -1)
            return "string";

        return type;


    }


}


module.exports = mySQLproxy;





