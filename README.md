# Flourish-API-dashboard-template
Creating a template for dashboards powered by the Flourish API - currently WIP

## To use locally
* open your terminal
* clone repo
* `cd`` into project run `npm install`
* get a flourish API key [following instructions here](https://developers.flourish.studio/api/getting-started/)
* create `config.json` file in the root of the project (this is important so the code knows where to find it and it doesn't get commited to github)
* copy the below into it and save:
```
    {
        "key": "PASTE YOUR API KEY HERE"
    }
```
* run `npm start` to run a local server and see the project

### To make changes / show different graphs
* go into `assets/config.json` - here you can add/remove ids of published flourish charts. Once you save these should be updated in the local server