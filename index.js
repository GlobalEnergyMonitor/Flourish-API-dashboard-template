console.log('hello 12345');
// https://docs.google.com/spreadsheets/d/e/2PACX-1vST2HEnH9gSQbpcsqJBMWOJZ6vuBtvl4n-PwpxJldD4GzyI_uRZ6hXcYOhkWRo_ZJmA32OfVNUJs99a/pub?gid=0&single=true&output=csv
const temp = '16659864';
const config = {};
const graphs = {};
let opts = {
    template: "@flourish/scatter",
    version: "4",
    container: "#chart",
    api_key: "<api-key>",
    bindings: {
        data: {
            x: "pos_x",
            y: "pos_y",
            metadata: ["country"]
        }
    },
    data: {
        data: [{
                country: "Argentina",
                pos_x: 1,
                pos_y: 2
            },
            {
                country: "Brazil",
                pos_x: 2,
                pos_y: 4
            },
            {
                country: "Colombia",
                pos_x: 3,
                pos_y: 9
            },
        ]
    },
    state: {
        layout: {
            title: "This is an API Example"
        }
    }
};
getData();

// TO DO: read data from google sheets if poss, currently would need to download data for each vis and convert -> feels like could get unweildy and have performance issues

async function getData() {
    const urls = ["./config.json", "./assets/config.json", "./assets/text.json", "./assets/data_change.json"];
    const keys = ["gem", "dashboard", "text", "data"];
    const promises = [];
    for (const url of urls) {
        promises.push(fetch(url));
    }

    Promise.all(promises)
        .then(responses => Promise.all(responses.map(r => r.json())))
        .then(jsonObjects => {
            jsonObjects.forEach((obj, i) => {
                config[keys[i]] = obj;
            })
            console.log('config', config)
        })
        .then(() => {
            if (config.dashboard.input_type === 'dropdown') implementDropdown();
            // add another to implement buttons
        })
        .then(() => renderVisualisation());
}

function implementDropdown() {
    const label = document.createElement('label');
    label.innerText = config.text.dropdown_label;
    label.for = "dropdown-selection"
    const dropdownEl = document.createElement('select');
    dropdownEl.id = "dropdown-selection";
    const dropdownData = config.text.dropdown.map(entry => entry[config.dashboard.input_key]);
    dropdownData.forEach(input => {
        const opt = document.createElement('option');
        opt.value = formatName(input);
        opt.text = input;
        dropdownEl.appendChild(opt);
    })
    const controlsContainer = document.querySelector('.controls-container');
    controlsContainer.appendChild(label);
    controlsContainer.appendChild(dropdownEl);

    dropdownEl.addEventListener('change', (evt) => {
        const selectedCountry = evt.target.value;
        updateGraphs(selectedCountry)
    })
}

function renderVisualisation() {
    const graphIDs = config.dashboard.flourish_ids;
    [temp].forEach(id => {
        const container = document.createElement('div');
        container.id = `chart-${id}`;
        document.querySelector('.flourish-container').appendChild(container);
        console.log('id', id);
        implentGraph(id);
    })
    // console.log('building', config);
}

function implentGraph(id) {
    graphs[id] = {};
    graphs[id].opts = {
        template: "@flourish/line-bar-pie",
        version: "27",
        container: `#chart-${id}`,
        api_key: config.gem.key,
        base_visualisation_id: id,
        bindings: {
            data: {
                label: "Year",
                value: ["Net change", "Added", "Retired"],
                // facet: "Year",
                // filter: "DataHeader5",
                metadata: ["description"],
            }
        },
        data: {
            data: [{
                "Country": "Global",
                "Year": "2000",
                "Net change": "30189",
                "Added": "34250",
                "Retired": "-4061",
                "description": "Need to develop a sentence for Global"
            }, {
                "Country": "Global",
                "Year": "2001",
                "Net change": "20090",
                "Added": "21693",
                "Retired": "-1603",
                "description": "Need to develop a sentence for Global"
            }, {
                "Country": "Global",
                "Year": "2002",
                "Net change": "20390",
                "Added": "24588",
                "Retired": "-4198",
                "description": "Need to develop a sentence for Global"
            }, {
                "Country": "Global",
                "Year": "2003",
                "Net change": "27281",
                "Added": "31587",
                "Retired": "-4306",
                "description": "Need to develop a sentence for Global"
            }, {
                "Country": "Global",
                "Year": "2004",
                "Net change": "34811",
                "Added": "36761",
                "Retired": "-1950",
                "description": "Need to develop a sentence for Global"
            }, {
                "Country": "Global",
                "Year": "2005",
                "Net change": "49570",
                "Added": "53887",
                "Retired": "-4317",
                "description": "Need to develop a sentence for Global"
            }, {
                "Country": "Global",
                "Year": "2006",
                "Net change": "89296",
                "Added": "91703",
                "Retired": "-2407",
                "description": "Need to develop a sentence for Global"
            }, {
                "Country": "Global",
                "Year": "2007",
                "Net change": "81112",
                "Added": "95807",
                "Retired": "-14695",
                "description": "Need to develop a sentence for Global"
            }]
        },
        state: {
            chart_type: "column_stacked_line",
            layout: {
                // title: "This is an API Example"
            }
        }
        // container: `#chart-${id}`,
        // api_key: config.gem.key,
        // base_visualisation_id: id,
        // bindings: {
        //     data: {
        //         x: "pos_x",
        //         y: "pos_y",
        //         metadata: ["country"]
        //     }
        // },
    };
    graphs[id].flourish = new Flourish.Live(graphs[id].opts);
}

function updateGraphs(country) {
    const filteredData = config.data.filter(entry => formatName(entry.Country) === country);
    console.log(('filter', filteredData));
    console.log((JSON.stringify(filteredData)));
    // Add a check to the data so only filtering if needed
    const graphIDs = config.dashboard.flourish_ids;
    [temp].forEach(id => {
        graphs[id].opts.data = {data: filteredData};
        // graphs[id].opts.bindings.metadata = ['description']
        graphs[id].opts.state.layout.title = config.text.title.replace('a test', `the ${filteredData[0].Country}`)
        graphs[id].flourish.update(graphs[id].opts)
    });

}

function formatName(string) {
    return string.toLowerCase().replace(/ /g, "_");
}