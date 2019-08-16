var _ = require('underscore');

module.exports = {
    createTestCase: function(name, objective, precondition, status, priority, labels, owner, component, issues, customFields, plainTextTestScript) {
        return {
            name: name,
            objective: objective,
            precondition: precondition,
            status: status,
            priority: priority,
            issues: issues,
            labels: labels,
            owner: owner,
            component: component,
            customFields: _(customFields).filter(function(customField) {
                return typeof customField.value !== 'undefined';
            }),
            steps: [],
            plainTextTestScript: plainTextTestScript
        };
    },

    addStep: function(testCase, description, expectedResult, testData) {
        testCase.steps.push({
            index: testCase.steps.length,
            description: description,
            testData: testData,
            expectedResult: expectedResult
        });
    }
};
