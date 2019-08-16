const xmlCreator = require('./xmlCreator');
const testCaseParser = require('./testCaseXMLParser');
const fs = require('fs');
const mkdirp = require('mkdirp');
const OUTPUT_FOLDER_NAME = 'output/'

function clearFolder(folderName) {
    mkdirp.sync(folderName);
    fs.readdirSync(folderName).forEach(function(file,index) {
        var curPath = folderName + "/" + file;
        fs.unlinkSync(curPath);
    });
}

function runConversion() {
    clearFolder(OUTPUT_FOLDER_NAME);

    fs.readdir('input', function(error, files) {
        if(error) {
            console.error("Could not read directory: \"/input\"", error);
            process.exit(1);
        }
        var total = 0;
        files.forEach(function(file) {
            if(file.startsWith('~$') || file.startsWith('.')) return;
            var testCases = testCaseParser.parseTestCases('input/' + file);
            total += testCases.length;
            var xml = xmlCreator.exportTestCases(testCases, new Date(), '1.0');
            fs.writeFile(OUTPUT_FOLDER_NAME + file, xml, function(err) {
                if (err) {
                    return console.log('Error importing file ' + file + ': ' + err);
                }
                console.log('Success: file converted with ' + testCases.length + ' test cases: ' + file);
            });
        });
        console.log('Total test cases: ' + total);
    });
}

runConversion();
