# spfx-template

## Summary
A HTML + Handlebars templating webpart with API data hydration.

## How it works
1. A template is created for the webpart
1. Data is retreived from an API
1. The webpart hydrates template with the data
<br>

## Features
* Anynomous, Basic, Graph and Microsoft App Registration auth
* Custom handlebar-helpers injection
* Custom header-script injection
* API Data sanitizing before HTML rendering
* External template hosting
* Webpart height and width customization
* Descriptive error messages
* Debug mode

## Templates
A template can consist of the following tags.

| Tag | Description | Required |
|---|---|---|
|```<content type="x-template">```|The HTML template|Yes
|```<content type="x-head">```|Script or Link elements to inject into the ```<head>``` element|No
|```<content type="x-inject">```|Runs javascript before rendering, used for registering handlebars-helpers|No
|```<content type="x-loading">```|HTML that will show insted of the default loading spinner|No

### Example
```HTML
<!-- This will be hydrated and rendered to the screen -->
<content type="x-template">
  <div>
    Hello Word!
    <!-- If the data from the api contains a message property this will be rendered here -->
    {{ message }}
    <!-- Using injected Handlebars-helper to log message to console -->
    {{log "Hello World!"}}
  </div>
</content>

<!-- This will be shown while loading data from the API -->
<content type="x-loading">
  <div>Loading data, please wait</div>
</content>

<!-- This will be injected into the HTML head-element before rendering -->
<content type="x-head">
  <script>
    alert('Hello world');
  </script>
</content>

<!-- This will be run by the WebPart before rendering -->
<content type="x-inject">
  <script>
    Handlebars.registerHelper('log', function(message) {
      console.log(message);
    });
  </script>
</content>
```

## Setup the project
1. run **npm i** to install dependencies
1. run **gulp trust-dev-cert** to trust the dev certificate

## Setup development environment
1. Run **npm serve** to start the dev server

## Build
1. Run **npm build**

After the build is done the webpart package will be located at */sharepoint/spfx-template.sppkg*<br>
This file is what you install on SharePoint