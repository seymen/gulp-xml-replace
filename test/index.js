/*jshint expr: true*/

var sinon = require('sinon');
var through = require('through2');
var expect = require('chai').expect;
var gutil = require('gulp-util');
var vinyl = require('./helpers/vinylHelper.js');
var plugin = require('../source/index.js');

var gutilLogMethod;
var throughObjMethod;

describe('feature: gulp-xml-replace plugin', function() {

	beforeEach(function() {
		gutilLogMethod = sinon.stub(gutil, 'log');
		throughObjMethod = sinon.stub(through, 'obj');
	});

	afterEach(function() {
		gutilLogMethod.restore();
		throughObjMethod.restore();
	});

	it('should throw error if options is null or empty', function(done) {
		var exception;
		try { plugin.replace(); } catch (e) { exception = e; }

		expect(exception).to.be.not.undefined;
		expect(exception).to.be.an.instanceof(gutil.PluginError);
		expect(exception.message).to.be.equal('options cannot be null or empty');

		done();
	});

	it('should ignore directories and pass them along', function(done) {
		var vinylDirectory = vinyl.getVinyl('folder', '', false, false, true);

		var error, nextFile;
		throughObjMethod
			.yields(vinylDirectory, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace({});

		expect(error).to.be.null;
		expect(nextFile).to.not.be.null;
		expect(nextFile.name).to.be.equal('folder');

		done();
	});

	it('should ignore null file and pass it along', function(done) {
		var vinylDirectory = vinyl.getVinyl('file', 'contents', true);

		var error, nextFile;
		throughObjMethod
			.yields(vinylDirectory, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace({});

		expect(error).to.be.null;
		expect(nextFile).to.be.not.null;
		expect(nextFile.isNull()).to.be.true;

		done();
	});

	it('should bypass _this_ file if it is not mentioned at all in replacement options', function(done) {
		var options = {
			'folder1/file1.xml': [
				{
					xpath: '/Description',
					value: 'test123'
				}
			]
		};

		var file = vinyl.getVinyl('folder1/someotherfile.xml', 'contents');

		var error, nextFile;
		throughObjMethod
			.yields(file, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.null;
		expect(nextFile.name).to.be.equal('folder1/someotherfile.xml');

		done();
	});

	it('should bypass _this_ file if no replacements are defined in options', function(done) {
		var options = {
			'folder1/file1.xml': []
		};

		var vinylDirectory = vinyl.getVinyl('folder1/file1.xml', '<a><b/></a>');

		var error, nextFile;
		throughObjMethod
			.yields(vinylDirectory, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.null;
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.yellow('folder1/file1.xml is configured without any xpath replacement options'));
		expect(nextFile.name).to.be.equal('folder1/file1.xml');
		expect(nextFile.contents.toString('utf8')).to.be.equal('<a><b/></a>');

		done();
	});

	it('should warn if non-existing replacements mistakenly specified in options', function(done) {
		var options = {
			'folder1/file1.xml': [
				{
					xpath: '/root/x',
					value: 'test123'
				}
			]
		};

		var fileContents = '<root><a>1</a></root>';

		var vinylFile = vinyl.getVinyl('folder1/file1.xml', fileContents);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.undefined;
		expect(nextFile).to.not.be.null;
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('replacing content in folder1/file1.xml'));
		expect(gutilLogMethod.getCall(1).args[0]).to.be.equal(gutil.colors.yellow('couldn\'t resolve replacement xpath /root/x in folder1/file1.xml'));
		expect(nextFile.contents.toString('utf8')).to.be.equal(fileContents);

		done();
	});

	it('should replace specified xpath element correctly', function(done) {
		var options = {
			'folder1/file1.xml': [
				{
					xpath: '/root/a',
					value: '2'
				}
			]
		};

		var fileContents = '<root><a>1</a></root>';
		var expectedContents = '<root><a>2</a></root>';

		var vinylFile = vinyl.getVinyl('folder1/file1.xml', fileContents);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.undefined;
		expect(nextFile).to.not.be.null;
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('replacing content in folder1/file1.xml'));
		expect(nextFile.contents.toString('utf8')).to.be.equal(expectedContents);

		done();
	});

	it('should replace specified xpath attribute correctly', function(done) {
		var options = {
			'folder1/file1.xml': [
				{
					xpath: '/root/a/@x',
					value: 'g'
				}
			]
		};

		var fileContents = '<root><a x="f">1</a></root>';
		var expectedContents = '<root><a x="g">1</a></root>';

		var vinylFile = vinyl.getVinyl('folder1/file1.xml', fileContents);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.undefined;
		expect(nextFile).to.not.be.null;
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('replacing content in folder1/file1.xml'));
		expect(nextFile.contents.toString('utf8')).to.be.equal(expectedContents);

		done();
	});

	it('should handle a combo of non-existing, element and attribute replacements all at the same time', function(done) {
		var options = {
			'folder1/file1.xml': [
				{
					xpath: '/notexist',
					value: 'fdfd'
				},
				{
					xpath: '/root/b',
					value: '1'
				},
				{
					xpath: '/root/a/@x',
					value: 'g'
				}
			]
		};

		var fileContents = 
			'<root><a x="f">1</a><b>2</b></root>';
		var expectedContents = 
			'<root><a x="g">1</a><b>1</b></root>';

		var vinylFile = vinyl.getVinyl('folder1/file1.xml', fileContents);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.undefined;
		expect(nextFile).to.not.be.null;
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('replacing content in folder1/file1.xml'));
		expect(gutilLogMethod.getCall(1).args[0]).to.be.equal(gutil.colors.yellow('couldn\'t resolve replacement xpath /notexist in folder1/file1.xml'));
		expect(nextFile.contents.toString('utf8')).to.be.equal(expectedContents);

		done();
	});

	it('should warn if file is not valid xml', function(done) {
		var options = {
			'folder1/file1.xml': [
				{
					xpath: '/root/x',
					value: 'test123'
				}
			]
		};

		var fileContents = '<root><a>1</root>';

		var vinylFile = vinyl.getVinyl('folder1/file1.xml', fileContents);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.undefined;
		expect(nextFile).to.not.be.null;
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('replacing content in folder1/file1.xml'));
		expect(gutilLogMethod.getCall(1).args[0]).to.be.equal(gutil.colors.yellow('warning during xml loading: unclosed xml attribute - @#[line:undefined,col:undefined]'));
		expect(nextFile.contents.toString('utf8')).to.be.equal(fileContents);

		done();
	});

	it('should warn if we want it to replace xpath in plain text file', function(done) {
		var options = {
			'folder1/file1.xml': [
				{
					xpath: '/root/x',
					value: 'test123'
				}
			]
		};

		var fileContents = 'plain text content';

		var vinylFile = vinyl.getVinyl('folder1/file1.xml', fileContents);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.undefined;
		expect(nextFile).to.not.be.null;
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.blue('replacing content in folder1/file1.xml'));
		expect(gutilLogMethod.getCall(1).args[0]).to.be.equal(gutil.colors.yellow('couldn\'t resolve replacement xpath /root/x in folder1/file1.xml'));
		expect(nextFile.contents.toString('utf8')).to.be.equal(fileContents);

		done();
	});

	it('should bypass if we want it to replace xpath in plain text file without any replacements', function(done) {
		var options = {
			'folder1/file1.xml': []
		};

		var fileContents = 'plain text content';

		var vinylFile = vinyl.getVinyl('folder1/file1.xml', fileContents);

		var error, nextFile;
		throughObjMethod
			.yields(vinylFile, null, function(err, file) { error = err; nextFile = file; });

		plugin.replace(options);

		expect(error).to.be.null;
		expect(nextFile).to.not.be.undefined;
		expect(nextFile).to.not.be.null;
		expect(gutilLogMethod.getCall(0).args[0]).to.be.equal(gutil.colors.yellow('folder1/file1.xml is configured without any xpath replacement options'));
		expect(nextFile.contents.toString('utf8')).to.be.equal(fileContents);

		done();
	});

});