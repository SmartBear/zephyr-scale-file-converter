const builder = require('xmlbuilder');
const trim = require('trim');
const _ = require('underscore');
const textile = require('textile-js');
const settings = require('../settings.json');

var message = '';

function toMarkdown(text) {
    if(!settings.convertWikiMarkup) return unescaped(trimText(text));
    
    var trimmedText = trimText(text);
    if(!trimmedText || !trimmedText.length) {
        return unescaped(trimmedText);
    }
    trimmedText = trimmedText.replace(/\r/g, ''); // Remove \r
    trimmedText = trimmedText.replace(/\\\\ /g, '\n'); // Remove JIRA \\
    trimmedText = trimmedText.replace(/\|\|([^|]+)(?=\|\|)/g, '|_.$1'); // Format table header
    trimmedText = trimmedText.replace(/\|\|[^|]*\n/g, '|\n'); // Format table header (last double pipes)
    trimmedText = trimmedText.replace(/ *\n */g, '\n'); // Remove spaces before and after line breaks
    
    var withoutPre = trimmedText.replace(/{{(.+)}}/g, '<pre>$1</pre>'); // Handle pre
    if (withoutPre !== trimmedText) message += "\n- Pre converted.";
    trimmedText = withoutPre;
    
    var withoutQuote = trimmedText.replace(/{quote}((.|\n)*?){quote}/g, '<blockquote>$1</blockquote>'); // Handle quote
    if (withoutQuote !== trimmedText) message += "\n- Quote converted.";
    trimmedText = withoutQuote;

    if(/[A-Z]+\(/g.test(trimmedText)) message += '\n- Affected by abbr';

    var colorReplaced = trimmedText.replace(/(\{color:([^\}]+)\})([^\{]*)(\{color\})/g, '<span style="color: $2">$3</span>');
    if (colorReplaced !== trimmedText) message += "\n- Color converted.";
    trimmedText = colorReplaced;

    return unescaped(textile(trimmedText));
}

function trimText(text) {
    return typeof text === 'undefined' ? undefined : trim(text + '');
}

function unescaped(text) {
    if(!text) return;
    text = text.replace(/<script/g, '&lt;script');
    text = text.replace(/><\/script>/g, '&gt;&lt;/script&gt;');
    return { '#raw': '<![CDATA[' + text + ']]>' };
}

function buildCustomFields(customFields) {
    return _(customFields).map(function(customField) {
        return {
            customField: {
                '@name': customField.name,
                '@type': customField.type,
                value: unescaped(trimText(customField.value))
            }
        };
    });
}

function buildTestStep(step) {
    return {
        step: {
            '@index': step.index,
            description: toMarkdown(step.description),
            testData: toMarkdown(step.testData),
            expectedResult: toMarkdown(step.expectedResult)
        }
    };
}

function buildTestScript(testCase) {
    var testScript;
    if(testCase.plainTextTestScript) {
        testScript = {
            '@type': 'plain',
            details: toMarkdown(testCase.plainTextTestScript)
        };
    } else {
        testScript = {
            '@type': 'steps',
            steps: _(testCase.steps).map(buildTestStep)
        };
    }
    return testScript;
}

function buildIssues(issues) {
    if(!issues || !issues.length) {
        return;
    }
    return _(issues).map(function(issue) {
        return {
            issue: {
                key: issue
            }
        };
    });
}

function buildLabels(labels) {
    if(!labels || !labels.length) return;
    return _(labels).map(function(label) {
        return {label: trimText(label)};
    });
}

function buildTestCase(testCase) {
    var convertedTestCase = {
        testCase: {
            name: unescaped(trimText(testCase.name)),
            objective: unescaped(trimText(testCase.objective)),
            precondition: unescaped(trimText(testCase.precondition)),
            status: unescaped(trimText(testCase.status)),
            priority: unescaped(trimText(testCase.priority)),
            labels: buildLabels(testCase.labels),
            owner: unescaped(trimText(testCase.owner)),
            component: unescaped(trimText(testCase.component)),
            issues: buildIssues(testCase.issues),
            testScript: buildTestScript(testCase),
            customFields: buildCustomFields(testCase.customFields)
        }
    };
    
    if(message !== '') {
        console.log('Converting test case: ' + trimText(testCase.name));
        console.log(message);
        message = '';
    }
    return convertedTestCase;
}

module.exports = {
    exportTestCases: function(testCases, date, modelVersion) {
        var project = {
            modelVersion: modelVersion,
            exportDate: date.toISOString().replace(/T/, ' ').replace(/\..+/, '').concat(' UTC'),
            testCases: _(testCases).map(buildTestCase)
        };

        var xml = builder.create({
            project: project
        }).end({
            pretty: true
        });
        return xml;
    }
}
