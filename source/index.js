var gutil = require('gulp-util');
var through = require('through2');
var dom = require('xmldom').DOMParser;
var select = require('xpath.js');

var PluginError = gutil.PluginError;
var PLUGIN_NAME = 'gulp-xml-replace';
var ATTRIBUTE = 2;

var xmlToString = function(xml) {
	var str = xml.toString(false);
	str = str.replace('<?xml version="1.0" encoding="UTF-8"?>', '');
	return str.replace(/\n/g, '');
};

var domParserOptions = {
	errorHandler: function(e) {
		e = e.replace(/\n/g, ' ')
			.replace(/\s\s/g, ' ');
		throw new PluginError(PLUGIN_NAME, e);
	}
};

module.exports = {
	replace: function(options) {
		if (!options) {
			throw new PluginError(PLUGIN_NAME, 'options cannot be null or empty');
		}

		return through.obj(function(file, enc, cb) {
			if (file.isDirectory()) {
				cb(null, file);
				return;
			}

			if (file.isNull()) {
				cb(null, file);
				return;
			}

			var path = file.relative;
			var replacementsForThisFile = options[path];

			if (!replacementsForThisFile) {
				cb(null, file);
				return;
			}

			if (!Object.keys(replacementsForThisFile).length) {
				gutil.log(gutil.colors.yellow(path + ' is configured without any xpath replacement options'));
				cb(null, file);
				return;	
			}

			var fileContents = file.contents.toString('utf8');
			var fileContentsXml = new dom(domParserOptions).parseFromString(fileContents);

			replacementsForThisFile.forEach(function(replacement) {
				var node = select(fileContentsXml, replacement.xpath)[0];

				if (node === undefined) {
					gutil.log(gutil.colors.yellow('couldn\'t resolve replacement xpath ' + replacement.xpath + ' in ' + path));
					return;
				}

				if (node.nodeType === ATTRIBUTE) {
					node.value = replacement.value;
				} else { //comment or element
					node.firstChild.data = replacement.value;
				}

				file.contents = new Buffer(xmlToString(fileContentsXml));
				gutil.log(gutil.colors.green('replaced content in ' + path));
			});

			cb(null, file);
		});
	}
};