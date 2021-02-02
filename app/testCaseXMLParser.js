var _ = require('underscore');
var testCaseBuilder = require('./testCaseBuilder');
var apiService = require('./apiService');
var trim = require('trim');
var fs = require('fs');
var xml2js = require('xml2js');
var inspect = require('eyes').inspector({maxLength: false});
var settings = require('../settings.json');
var fieldMappings = settings.mappings;
var Entities = require("html-entities").XmlEntities;
const htmlEntities = new Entities();

var ignoredCustomFields = [];
if(fieldMappings.preconditionCustomFieldId && (fieldMappings.preconditionCustomFieldId !== '')) {
    ignoredCustomFields.push('customfield_' + fieldMappings.preconditionCustomFieldId);
}
if(fieldMappings.plainTextTestScriptFieldId && (fieldMappings.plainTextTestScriptFieldId !== '')) {
    ignoredCustomFields.push('customfield_' + fieldMappings.plainTextTestScriptFieldId);
}

module.exports = {
    parseTestCases: async function(fileName) {
        var testCases = [];
        
        var data = fs.readFileSync(fileName);

        var str = data.toString();
        
        // Add CDATA to Jira description
        str = str.replace(new RegExp('<description>', 'g'), '<description><![CDATA[');
        str = str.replace(new RegExp('<\/description>', 'g'), ']]></description>');

        if(data.indexOf('com.xpandit.plugins.xray:manual-test-steps-custom-field') >= 0) {

            // Add CDATA to XRay step description
            str = str.replace(new RegExp('<\/index>[^<]*<step>', 'g'), '</index><step><![CDATA[');
            str = str.replace(new RegExp('<\/step>[^<]*<data', 'g'), ']]></step><data');

            // Add CDATA to XRay step data
            str = str.replace(new RegExp('<\/step>[^<]*<data>', 'g'), '</step><data><![CDATA[');
            str = str.replace(new RegExp('<step\/>[^<]*<data>', 'g'), '<step/><data><![CDATA[');
            str = str.replace(new RegExp('<\/data>[^<]*<result', 'g'), ']]></data><result');

            // Add CDATA to XRay step expected result
            str = str.replace(new RegExp('<\/data>[^<]*<result>', 'g'), '</data><result><![CDATA[');
            str = str.replace(new RegExp('<data\/>[^<]*<result>', 'g'), '<data/><result><![CDATA[');
            str = str.replace(new RegExp('<\/result>[^<]*<\/step', 'g'), ']]></result></step');

            // Encode ampersands
            str = str.replace(new RegExp('& ', 'g'), '&amp; ');

        }
        data = str;

        const parsedData = await this._parseXML(data);
        const issues = parsedData.rss.channel[0].item;
        for(const issue of issues) {
            var testCase;
            try {
                testCase = await this._convertIssueToTestCase(issue);
            } catch(e) {
                console.log('Error converting test case: ' + issue.summary);
                throw e;
            }
            testCases.push(testCase);
        }

        return testCases;
    },

    _parseXML: function(xml) {
        return new Promise((resolve, reject) => {
            const parser = new xml2js.Parser();
            parser.parseString(xml, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    },

    _convertIssueToTestCase: async function(issue) {
        var testCase = testCaseBuilder.createTestCase(
            issue.summary,
            settings.decodeIssueDescription ? htmlEntities.decode(issue.description[0]) : issue.description,
            this._getPrecondition(issue),
            this._getStatus(issue),
            this._getPriority(issue),
            this._getLabels(issue),
            await this._getOwner(issue),
            this._getComponent(issue),
            this._getIssueLinks(issue),
            this._getCustomFields(issue),
            this._getPlainTextTestScript(issue)
        );
        if(!this._getConfig('plainTextTestScriptFieldId')) {
            var steps = this._getSteps(issue);
            if(steps) {
                _(steps).forEach(function(step) {
                    testCaseBuilder.addStep(testCase, step.description, step.expectedResult, step.testData);            
                });
            }      
        }
        return testCase;
    },

    _getPrecondition: function(issue) {
        if(!fieldMappings.precondition || fieldMappings.precondition === '') return;
        var preconditionCustomField = this._getCustomFieldById(issue, fieldMappings.precondition);
        return this._trimOrNull(preconditionCustomField.customfieldvalues[0].customfieldvalue[0]);
    },

    _getStatus: function(issue) {
        if(!issue.status || !issue.status.length) return;
        return this._trimOrNull(issue.status[0]._);
    },

    _getPriority: function(issue) {
        if(!issue.priority || !issue.priority.length) return;
        var priorityValue = this._trimOrNull(issue.priority[0]._);
        return fieldMappings.priority && fieldMappings.priority[priorityValue] ? fieldMappings.priority[priorityValue] : priorityValue;
    },

    _getLabels: function(issue) {
        if(!issue.labels || !issue.labels.length) return [];
        return _(issue.labels[0].label).map(function(label) {
            return this._trimOrNull(label);
        }.bind(this));
    },

    _getOwner: async function(issue) {
        const targetField = this._trimOrNull(fieldMappings.owner);
        if(!targetField) return;

        const username = this._trimOrNull(issue[targetField][0].$.username);
        if(!username) return username;

        const user =  await apiService.getUserByUsername(username);
        return user && user.key;
    },

    _getComponent: function(issue) {
        // Just the first component found will be considered
        var components = this._getComponents(issue);
        if(!components.length) return;
        return components[0];
    },

    _getComponents: function(issue) {
        if(!issue.component || !issue.component.length) return [];
        return _(issue.component).map(function(component) {
            return this._trimOrNull(component);
        }.bind(this));
    },

    _getCustomFields: function(issue) {
        var customfields = [];
        customfields.push({
            name: 'Original issue key',
            value: this._trimOrNull(issue.key[0]._),
            type: 'SINGLE_LINE_TEXT'
        });
        if(!!issue.environment && issue.environment.length) {
            var environment = this._trimOrNull(issue.environment[0]);
            if(!!environment) {
                customfields.push({
                    name: 'Environment',
                    value: environment,
                    type: 'MULTI_LINE_TEXT'
                });
            }
        }
        var textCustomFields = this._getCustomFieldsByType(issue, 'com.atlassian.jira.plugin.system.customfieldtypes:textarea');
        _(textCustomFields).each(function(customField) {
            var cfName = trim(customField.customfieldname[0]);
            if(!cfName) return;
            customfields.push({
                name: cfName,
                value: this._trimOrNull(customField.customfieldvalues[0].customfieldvalue[0]),
                type: 'MULTI_LINE_TEXT'
            });
        }.bind(this));

        var floatCustomFields = this._getCustomFieldsByType(issue, 'com.atlassian.jira.plugin.system.customfieldtypes:float');
        _(floatCustomFields).each(function(customField) {
            var cfName = trim(customField.customfieldname[0]);
            if(!cfName) return;
            customfields.push({
                name: cfName,
                value: this._trimOrNull(customField.customfieldvalues[0].customfieldvalue[0]),
                type: 'DECIMAL'
            });
        }.bind(this));

        var selectCustomFields = this._getCustomFieldsByType(issue, 'com.atlassian.jira.plugin.system.customfieldtypes:select');
        _(selectCustomFields).each(function(customField) {
            var cfName = trim(customField.customfieldname[0]);
            if(!cfName) return;
            customfields.push({
                name: cfName,
                value: this._trimOrNull(customField.customfieldvalues[0].customfieldvalue[0]._),
                type: 'SINGLE_CHOICE_SELECT_LIST'
            });
        }.bind(this));

        var components = this._getComponents(issue);
        if(components.length > 1) {
            customfields.push({
                name: 'Additional linked components',
                value: components.slice(1).join(', '),
                type: 'MULTI_CHOICE_SELECT_LIST'
            });
        }
        return customfields;
    },

    _getCustomFieldsByType: function(issue, typeName) {
        return _(issue.customfields[0].customfield)
            .filter(function(customField) {
                return (trim(customField.$.key) === typeName) && !_(ignoredCustomFields).contains(customField.$.id);
            });
    },

    _getCustomFieldById: function(issue, id) {
        return _(issue.customfields[0].customfield)
            .find(function(customField) {
                return (trim(customField.$.id) === 'customfield_' + id);
            });
    },

    _getIssueLinks: function(issue) {
        if(!issue.issuelinks || !issue.issuelinks.length) return [];
        var issueLinks = [];
        _(issue.issuelinks[0].issuelinktype).each(function(issueLinkType) {
            var outwardlinks = issueLinkType.outwardlinks;
            var inwardlinks = issueLinkType.inwardlinks;
            if(outwardlinks) {
                _(outwardlinks[0].issuelink).each(function(link) {
                    issueLinks.push(this._trimOrNull(link.issuekey[0]._));
                }.bind(this));
            }
            if(inwardlinks) {
                _(inwardlinks[0].issuelink).each(function(link) {
                    issueLinks.push(this._trimOrNull(link.issuekey[0]._));
                }.bind(this));
            }
        }.bind(this));
        return _(issueLinks).uniq();
    },

    _getSteps: function(issue) {
        return this._getZephyrSteps(issue) || this._getXraySteps(issue);
    },

    _getZephyrSteps: function(issue) {
        var customFields = this._getCustomFieldsByType(issue, 'com.thed.zephyr.je:zephyr-je-customfield-teststep');
        if(!customFields.length) return;
        var zephyrCustomField = customFields[0];
        if(!zephyrCustomField) return;
        return _.chain(zephyrCustomField.customfieldvalues[0].steps[0].step)
            .sortBy(function(step) {
                return parseInt(step.orderId[0]);
            })
            .map(function(step) {
                return {
                    description: this._trimOrNull(step.step[0]),
                    testData: this._trimOrNull(step.data[0]),
                    expectedResult: this._trimOrNull(step.result[0])
                };
            }.bind(this))
            .value();
    },

    _getXraySteps: function(issue) {
        var customFields = this._getCustomFieldsByType(issue, 'com.xpandit.plugins.xray:manual-test-steps-custom-field');
        if(!customFields.length) return;
        
        var xRayCustomField = customFields[0];
        if(!xRayCustomField) return;

        var customFieldValues = xRayCustomField.customfieldvalues;
        if(!customFieldValues.length) return;
        
        var steps = customFieldValues[0].steps;
        if(!steps || !steps.length) return;

        return _.chain(steps[0].step)
            .sortBy(function(step) {
                return parseInt(step.index[0]);
            })
            .map(function(step) {
                return {
                    description: this._trimOrNull(step.step[0]),
                    testData: this._trimOrNull(step.data[0]),
                    expectedResult: this._trimOrNull(step.result[0])
                };
            }.bind(this))
            .value();
    },

    _getPlainTextTestScript: function(issue) {
        var customFieldId = this._getConfig('plainTextTestScriptFieldId');
        if(!customFieldId) return;
        var plainTextScriptCustomField = this._getCustomFieldById(issue, customFieldId);
        return this._trimOrNull(plainTextScriptCustomField.customfieldvalues[0].customfieldvalue[0]);
    },

    _trimOrNull: function(text) {
        try {
            if(!text) return;
            if(trim(text) === '') return;
            return trim(text);
        } catch(e) {
            console.log('Error trimming text: ', text);
            throw e;
        }
    },

    _getConfig: function(configName) {
        return this._trimOrNull(fieldMappings[configName]);
    }
};
