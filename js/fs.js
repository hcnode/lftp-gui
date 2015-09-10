/**
 * Created by harry on 15/9/7.
 */
var fs = require("fs-extra");
var _ = require('lodash');
var moment = require("moment");
var filesize = require('file-size');

module.exports = {
	getFiles : function(path, cb){
		var result = [];
		fs.readdir(path, function (err, files) {
			_.forEach(files, function (file) {
				var item = {};
				item.name = file;
				result.push(item);

				var stat = fs.statSync((path=="/" ? "" : path) + '/' + file);
				item.size = stat.size;
				item.moment = new moment(stat.mtime);
				if (stat.isDirectory()) {
					item.type = "folder";
				}else{
					item.type = "file";
				}
				if(item.size){
					item.filesize = filesize(item.size);
				}

				item.id = "item-" + Math.round((Math.random() * 10000000000));
				item.path = path;
			});
			cb(result);
		});
	},
	filter : function(data, type){
		return _.filter(data, function (item) {
			return item.type == type && item.name != "." && item.name != "..";
		});
	},
	saveConf : function(conf, cb){
		var path = process.cwd();
		fs.writeFile(path + '/config.json', JSON.stringify(conf), function (err) {
			cb(err);
		});
	},
	readConf : function(cb){
		var path = process.cwd();
		var confFile = path + '/config.json';
		if(fs.existsSync(confFile)) {
			fs.readFile(confFile, function (err, data) {
				if(data){
					data = JSON.parse(data);
				}
				cb(data || []);
			});
		}else{
			cb([]);
		}
	}
};