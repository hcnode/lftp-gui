/**
 * Created by harry on 15/9/7.
 */
var ftp = require("./js/ftp");
var fs = require("./js/fs");
var _ = require("lodash");
var deps = [];
var gui = require('nw.gui');

win = gui.Window.get();
var nativeMenuBar = new gui.Menu({ type: "menubar" });
try {
	nativeMenuBar.createMacBuiltin("My App");
	win.menu = nativeMenuBar;
} catch (ex) {
	console.log(ex.message);
}

var app = angular.module("app", deps).controller("mainCtrl", ['$scope', '$timeout', '$sce',  function ($scope, $timeout, $sce) {
	$scope.outputs = [];
	function output(result, type) {
		var data = type == "data" ? ((typeof result.data == "object" ? JSON.stringify(result.data) : (result.data || "")) || "")
									: (result.error || result);
		data = data.replace(/\n/ig, "<br>");
		var cmd = result.cmd || "";
		$scope.outputs.push(('<div style="color:'+ (type == "error" ? "red" : "green" ) +'">'+ type +':'+ new Date().toISOString() +'</div>' +
		(type == "data" ? '<div style="color: blue;">cmd:'+ cmd +'</div><div>'+ data +'</div>' : '<div style="color: red">'+ data +'</div>')));
		$timeout(function () {
			document.getElementById("output_end").scrollIntoView();
		}, 100);
	}
	$scope.deliberatelyTrustOutput = function(msg) {
		return $sce.trustAsHtml(msg);
	};
	ftp.init(function (error, result) {
		output(error || result.error, "error");
	}, function (result) {
		output(result, "data");
	});

	$scope.remoteCheckedFile = {};
	$scope.currentRemotePath = "/";
	$scope.remoteFolderItems = null;// entire tree
	$scope.currentRemoteFolderItem = null;// current item
	$scope.remoteFiles = null;

	$scope.localCheckedFile = {};
	$scope.currentLocalPath = "/";
	$scope.localFolderItems = null;// entire tree
	$scope.currentLocalFolderItem = null;// current item
	$scope.localFolderItems = null;
	var remoteMap = {};
	var localMap = {};

	function saveToRemoteMap(folderItems) {
		for(var i=0;i<folderItems.length;i++){
			remoteMap[folderItems[i].id] = folderItems[i];
		}
	}

	function saveToLocalMap(folderItems) {
		for(var i=0;i<folderItems.length;i++){
			localMap[folderItems[i].id] = folderItems[i];
		}
	}

	function getRemoteItems(data) {
		var items = ftp.getLsItem(data, $scope.currentRemotePath);
		$scope.remoteFiles = ftp.filter(items, "file");
		var folderItems = ftp.filter(items, "folder");
		if(!$scope.currentRemoteFolderItem){
			$scope.remoteFolderItems = folderItems;
		}else{
			$scope.currentRemoteFolderItem.children = folderItems;
		}
		saveToRemoteMap(folderItems);
	}
	function getLocalItems(data) {
		$scope.localFiles = fs.filter(data, "file");
		var folderItems = fs.filter(data, "folder");
		if(!$scope.currentLocalFolderItem){
			$scope.localFolderItems = folderItems;
		}else{
			$scope.currentLocalFolderItem.children = folderItems;
		}
		saveToLocalMap(folderItems);
	}


	fs.getFiles($scope.currentLocalPath, function (data) {
		$timeout(function () {
			getLocalItems(data);
		})
	});
	$scope.cdRemote = function (item, cb) {
		var path = item.path + "/" + item.name;
		$scope.remoteFiles = [];
		$scope.remoteCheckedFile = {};
		$scope.currentRemotePath = path;
		$scope.currentRemoteFolderItem = remoteMap[item.id];
		ftp.cd(path).ls().exec(function (result) {
			$timeout(function () {
				getRemoteItems(result.data);
				cb && cb(result.error);
			})
		})
	};
	$scope.cdLocal = function (item, cb, isClick) {
		var path = item.path + "/" + item.name;
		$scope.localFiles = [];
		$scope.localCheckedFile = {};
		$scope.currentLocalPath = path;
		$scope.currentLocalFolderItem = localMap[item.id];
		fs.getFiles(path, function (data) {
			$timeout(function () {
				getLocalItems(data);
				if (!isClick || 1) {
					$timeout(function () {
						document.getElementById("pos-" + item.id).scrollIntoView();
					}, 100);
				}
				cb && cb();
			})
		});
	};
	$scope.checkedAll = {};
	$scope.checkRemoteAll = function () {
		for(var i=0;i<$scope.remoteFiles.length;i++){
			$scope.remoteCheckedFile[$scope.remoteFiles[i].id] = $scope.checkedAll.remote;
		}
	};
	$scope.checkLocalAll = function () {
		for(var i=0;i<$scope.localFiles.length;i++){
			$scope.localCheckedFile[$scope.localFiles[i].id] = $scope.checkedAll.local;
		}
	};
	$scope.serverConf = [];
	fs.readConf(function (conf) {
		$timeout(function () {
			$scope.serverConf = conf;
		});
	});
	$scope.editServer = {};
	$scope.editPath = {selectedPath:{}};
	$scope.createNew = function () {
		$scope.editServer = {protocol : "sftp", paths : []};
	};
	angular.element('#frmInitialPath').validator().on('submit', function (e) {
		if (e.isDefaultPrevented()) {
			// handle the invalid form...
		} else {
			var path = _.findWhere($scope.editServer.paths, {name : $scope.editPath.selectedPath.name});
			if(path){
				angular.extend(path, $scope.editPath.selectedPath);
			}else{
				$scope.editServer.paths = $scope.editServer.paths || [];
				$scope.editServer.paths.push($scope.editPath.selectedPath);
			}
			$scope.editPath.selectedValue = "";
			$scope.editPath.selectedPath = {};

		}
	});
	angular.element('#frmServer').validator().on('submit', function (e) {
		if (e.isDefaultPrevented()) {
			// handle the invalid form...
		} else {
			if($scope.editServer.id){
				var server = _.findWhere($scope.serverConf, {id : $scope.editServer.id});
				if(server){
					angular.extend(server, $scope.editServer);
				}else{
					$scope.serverConf.push($scope.editServer);
				}
			}else{
				$scope.editServer.id = new Date().valueOf();
				$scope.serverConf.push($scope.editServer);
			}
			fs.saveConf($scope.serverConf, function (err) {
				if(err){
					output(err, "error");
				}
			});
			$('#editModal').modal('hide');
		}
	});
	$scope.save = function () {
		angular.element('#frmServer').submit();
	};
	function gotoRemotePath(remote) {
		var folders = remote.split("/");
		(function(root) {
			var callee = arguments.callee;
			if (folders.length > 0) {
				var item = folders.shift();
				if (item) {
					if (!root) {
						root = _.findWhere($scope.remoteFolderItems, {name: item});
					} else {
						root = _.findWhere(root.children, {name: item});
					}
					if(root) {
						$scope.cdRemote(root, function (error) {
							if (!error) {
								document.getElementById("chk-" + root.id).checked = true;
								$timeout(function () {
									document.getElementById("pos-" + root.id).scrollIntoView();
								}, 100);
								callee.call(this, root);
							}
						})
					}else{
						output({error: item + " not found"}, "error")
					}
				}else{
					callee.call(this, root);
				}
			}
		})(null);
	}
	function gotoLocalPath(local) {
		var folders = local.split("/");
		(function(root) {
			var callee = arguments.callee;
			if (folders.length > 0) {
				var item = folders.shift();
				if (item) {
					if (!root) {
						root = _.findWhere($scope.localFolderItems, {name: item});
					} else {
						root = _.findWhere(root.children, {name: item});
					}
					if (root) {
						$scope.cdLocal(root, function () {
							document.getElementById("chk-" + root.id).checked = true;
							$timeout(function () {
								document.getElementById("pos-" + root.id).scrollIntoView();
							}, 100);
							callee.call(this, root);
						})
					}else{
						output({error: item + " not found"}, "error")
					}
				}else{
					callee.call(this, root);
				}
			}
		})(null);
	}

	$scope.connect = function () {
		$scope.currentRemotePath = "/";
		ftp.create($scope.editServer).cd($scope.currentRemotePath).ls().exec(function (result) {
			$timeout(function () {
				getRemoteItems(result.data);
				if($scope.editPath.selectedPath){
					var remote = $scope.editPath.selectedPath.remote;
					if(remote) {
						gotoRemotePath(remote);
					}
				}
			})
		});
		$('#editModal').modal('hide');
		if($scope.editPath.selectedPath){
			var local = $scope.editPath.selectedPath.local;
			if(local && require("fs").existsSync(local)){
				gotoLocalPath(local);
			}
		}
	};

	$scope.showConf = function (server) {
		$scope.editServer = server;
		$scope.editPath = {selectedPath:{}};
	};

	$scope.delete = function () {
		if($scope.editServer.id){
			var index = _.findIndex($scope.serverConf, {id : $scope.editServer.id});
			if(index != -1){
				$scope.serverConf.splice(index, 1);
				fs.saveConf($scope.serverConf, function (err) {
					if(err){
						output(err, "error");
					}
				});
			}
		}

		$('#editModal').modal('hide');
	};
	$scope.savePath = function () {
		angular.element('#frmInitialPath').submit();
	};
	$scope.getSelectedPath = function (value) {
		value = value || $scope.editPath.selectedValue;
		if(value && value.length > 0) {
			$scope.editPath.selectedPath = _.findWhere($scope.editServer.paths, {name: value[0]});
		}
	}
}]);