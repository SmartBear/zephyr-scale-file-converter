
# README #

A file converter for converting *Zephyr for Jira Server/DC* or *Xray* XML files to the *Zephyr Scale* XML file format. After the conversion, the resulting file can be imported to Zephyr Scale.

## Requirements ##
* NodeJs 14.x

## How to use ##
1) Export a XML file from Jira with Zephyr/Xray test cases. It should be one file per project, since the test case import in Zephyr Scale is by project.

2) Move the exported XML files to the folder ``input``. Files with names starting with ``.`` or ``~$`` will be ignored.

3) Configure settings on file ``settings.json``:

* ``preconditionCustomFieldId``: maps a Jira custom field ID to the default Zephyr Scale field ``precondition``.
* ``plainTextTestScriptFieldId``: maps a Jira custom field ID to a plain text test script. This will ignore the standard Zephyr/XRay test steps.
* ``owner``: maps the Jira issue assignee or reporter fields to ``owner``. The only accepted values are ``assignee`` or ``reporter``. If the ``owner`` is set, then the ``jiraServerSettings`` configuration is also required to establish a connection with the Jira Server/DC REST API to convert the usernames into user keys.
* ``priority``: maps Jira priority values to Zephyr Scale values (High, Normal, Low).
* ``convertWikiMarkup``: set option to convert test case steps from wiki markup format to html. This is needed for some versions of Zephyr, which will export test case steps using wiki markup format.
* ``decodeIssueDescription``: set option to decode issues description, for when Jira exports this field html encoded.
* ``jiraServerSettings``: sets credential information to allows this file converter to connect to Jira Server/DC REST API. This is required if the ``owner`` setting is configured.
 
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
	"decodeIssueDescription": true,
	"jiraServerSettings": {
		"url": "https://jira.mydomain.com", // or it could be "https://mydomain.com/jira", for example
		"user": "myUser",
		"password": "myPassord"
	}
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
	"decodeIssueDescription": true,
	"jiraServerSettings": {
		"url": "",
		"user": "",
		"password": ""
	}
}
```

4) Open a terminal window, and navigate to the directory where the repository has been cloned to: ``cd <zephyr-scale-file-converter-dir>``.

5) Install the Javascript dependencies by executing: ``npm install``.

6) Run the conversion by executing: ``npm start``.

7) Check the converted files on folder ``output/``.

8) Import each converted file in Zephyr Scale using the default import option "Test Management for Jira".

## Troubleshooting ##

### Unexpected close tag ###
Supposing that you have a file named myInput.xml on /input folder.
During npm start you get the following error (or similar):
```
Unexpected close tag
Line: 96315
Column: 251
Char: >
```
then go to the console command (from inside zephyr-scale-file-converter) and run:
```
vi temp/myInput.xml
```
and later go to the line 96316 (note that we are looking for the line stated in the error message + 1) 
you can do that by pressing ':' and write:
```
:call cursor(96316,251)
```
there you will have a > character and what is in the left side is what is were the error happened.

*Note: be aware that you can use other text editors, but other text editors can show the content in a different way (we do recommend to use vi)

### Exported some test cases, but the system is importing only one ###

This is a known error, the error is with the library xmlbuilder@9.0.4

#### Workarounds:

1. Execute this to uninstall xmlbuilder
    ```
    npm uninstall xmlbuilder --save-dev
    ```
    And install the correct version of xmlbuilder dependency,  version 2.6.4:
    ```
    npm install xmlbuilder@2.6.4 --save-dev
    ```
    → Then, run to convert the XML file: npm start

2. If the problem persists, alternatively, you might manually remove all the extra occurrences of the new converted XML file.

   Remove all extra testCases tags:

    ```
     </testCases>
      <testCases>
    ```
    And also the extra customFields tags:
    ```
    </customFields>
    <customFields>
    ```
