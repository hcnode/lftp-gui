/**
 * Created by harry on 15/9/7.
 */
var ftps = require('ftps');
var _ = require('lodash');
var moment = require("moment");
var filesize = require('file-size');
module.exports = {
	client: null,
	onerror: null,
	ondata: null,
	init: function (onerror, ondata) {
		this.onerror = onerror;
		this.ondata = ondata;
	},
	getLsItem: function (data, currentPath) {
		var result = [];
		var items = data.split("\n");
		for (var i = 0; i < items.length; i++) {
			var item = /(\d+) (\w{3})\s+(\d+)\s+((\d\d:\d\d)|(\d{4})) (.+)$/
					.test(items[i]) && {
					size: RegExp.$1,
					month: RegExp.$2,
					day: RegExp.$3,
					time: RegExp.$5,
					year: RegExp.$6,
					name: RegExp.$7
				};
			if(item) {
				item.type = items[i].indexOf("-") == 0 ? "file" : "folder";
				item.id = "item-" + Math.round((Math.random() * 10000000000));
				item.path = currentPath;
				if(item.size){
					item.filesize = filesize(item.size);
				}
				if (item.year) {
					item.moment = moment(item.year + '-' + item.month + '-' + item.day, "YYYY-MMM-D");
				} else {
					item.moment = moment(item.time + '-' + item.month + '-' + item.day, "HH:mm-MMM-D");
				}
			}

			item && result.push(item);
		}
		return result;
	},
	filter : function (data, type) {
		return _.filter(data, function (item) {
			return item.type == type && item.name != "." && item.name != "..";
		});
	},
	sort : function (data, field) {
		return _.sortBy(data, field);
	},
	create: function (conf) {
		this.client = new ftps(conf);
		return this;
	},
	cd: function (path) {
		this.client.cd(path);
		return this;
	},
	ls: function () {
		this.client.ls();
		return this;
	},
	pwd: function () {
		this.client.pwd();
		return this;
	},
	cat: function (path) {
		this.client.cat(path);
		return this;
	},
	put: function (localPath, remotePath) {
		this.client.put(localPath, remotePath);
		return this;
	},
	get: function (remotePath, localPath) {
		this.client.get(remotePath, localPath);
		return this;
	},
	mv: function (from, to) {
		this.client.mv(from, to);
		return this;
	},
	rm: function () {
		this.client.rm.apply(this.client, arguments);
		return this;
	},
	rmdir: function () {
		this.client.rmdir.apply(this.client, arguments);
		return this;
	},
	exec: function (cb) {
		var that = this;
		this.client.exec(function (error, result) {
			if (result.error) {
				that.onerror(result);
			} else {
				that.ondata(result);
				cb && cb(result);
			}
		});
	}
};