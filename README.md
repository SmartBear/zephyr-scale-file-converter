
# README #

A file converter for converting *Zephyr* or *Xray* XML files to the *TM4J - Test Management for Jira* XML file format. After the conversion, the resulting file can be imported to TM4J.

## Requirements ##
* NodeJs 8.x

## How to use ##
1. Export a XML file from Jira with Zephyr/Xray test cases. It should be one file per project, since the test case import in TM4J is by project.

2. Move the exported XML files to the folder ``input``. Files with names starting with ``.`` or ``~$`` will be ignored.

3. Configure settings on file ``settings.json``:
* ``preconditionCustomFieldId``: maps a Jira custom field ID to the default TM4J field ``precondition``.
* ``plainTextTestScriptFieldId``: maps a Jira custom field ID to a plain text test script. This will ignore the standard Zephyr/XRay test steps.
* ``owner``: maps the Jira issue assignee or reporter fields to ``owner``. Only accepted values are ``assignee`` or ``reporter``.
* ``priority``: maps Jira priority values to TM4J values (High, Normal, Low).
* ``convertWikiMarkup``: set option to convert test case steps from wiki markup format to html. This is needed for some versions of Zephyr, which will export test case steps using wiki markup format.
* ``decodeIssueDescription``: set option to decode issues description, for when Jira exports this field html encoded.

Examples:
```
{
	"mappings": {
		"preconditionCustomFieldId": "10100",
		"plainTextTestScriptFieldId": "10200",
		"owner": "assignee" // or it could be "reporter",
		"priority": {
			"MyCustomPriority": "High",
			"MyOtherCustomPriority": "Normal",
			"Another": "Low",
			"Last": "Low"
		}
	},
	"convertWikiMarkup": true,
	"decodeIssueDescription": true
}
```

If you don't want to map anything, please leave the fields empty or with default values. This should work for most scenarios:
```
{
	"mappings": {
		"preconditionCustomFieldId": "",
		"plainTextTestScriptFieldId": "",
		"owner": "",
		"priority": {}
	},
	"convertWikiMarkup": false,
	"decodeIssueDescription": true
}
```
4. Open a terminal window, and navigate to the directory where the repository has been cloned to: ``cd <tm4j-file-converter-dir>``.

5. Install the Javascript dependencies by executing: ``npm install``.

6. Run the conversion by executing: ``npm start``.

7. Check the converted files on folder ``output/``.

8. Import each converted file in TM4J using the default import option "Test Management for Jira".