# Flourish API dashboard template
Creating a template for dashboards powered by the Flourish API - currently WIP

## To use locally
* open your terminal
* clone repo
* `cd` into project run `npm install`
* get a flourish API key [following instructions here](https://developers.flourish.studio/api/getting-started/)
* create `.env` file in the root of the project (this is important so the code knows where to find it and it doesn't get commited to github)
* copy the below into it and save:
```
FLOURISH_API_KEY=YOUR_API_KEY_HERE
PORT=8080
```
* run `npm start`
* open your browser and navigate to http://localhost:8080/

### To make changes / show different graphs
You can control which graphs are showing, and in what order from `public/assets/config.json`

Overview:
```
{
    "flourish-id": {
        "title": "Title of the graph", // this can be changed dynamically - eg replacing a flag `{{country}}` with a value
        "x_axis": "column-1", // this references the column name of the linked dataset
        "values": [ // array of column names of the linked dataset. One for classic bar chart/simple scatter, multiple for combined columns
            "column-2",
            "column-3",
        ],
        "pop_up": [
            "column-4" // column name for any tool tip info - can have more than one value
        ],
        "dataset": "data", // name of dataset. Currently this is local to the project, but looking into pulling from google sheets
        "initial_state": "state-1", // landing state of graph (eg country set to filter to Global)
        "filterable": true, // is the graph filterable eg by country. This value is a boolean true/false
        "filter_by": "column-5" // what it is filterable by
    },
    "flourish_ids": [
        "id-1", // order of flourish ids as the graphs will appear in the page. Must have corresponding ID in this json file
        "id-2"

    ],
    "input_type": "dropdown", // input type to add to the page: dropdown (or soon to be buttons)
    "filter_key": "column-5" // what column in dataset to filter by
}
```

Example:
```
{
    "15821879": {
        "title": "Coal plant capacity starting construction outside China is on track for record annual low",
        "x_axis": "Period",
        "values": [
            "Yearly Construction Starts"
        ],
        "pop_up": null,
        "dataset": "data_construction",
        "filterable": false
    },
    "16566530": {
        "title": "What is the age breakdown of coal plants?",
        "x_axis": "decade",
        "values": [
            "CFB",
            "IGCC",
            "Subcritical",
            "Supercritical",
            "Ultra-supercritical",
            "Unknown"
        ],
        "pop_up": [
            "text"
        ],
        "dataset": "data_age",
        "initial_state": "Global",
        "filterable": true,
        "filter_by": "Country"
    },
    "flourish_ids": [
        "15821879",
        "16566530"

    ],
    "input_type": "dropdown",
    "filter_key": "Country"
}
```
